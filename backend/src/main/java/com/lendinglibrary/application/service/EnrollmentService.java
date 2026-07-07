package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.EnrollmentResponse;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.Enrollment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserService userService;
    private final DomainEventPublisher events;
    private final LessonProgressService lessonProgressService;

    public List<EnrollmentResponse> myEnrollments(String email) {
        User user = userService.findByEmail(email);
        return enrollmentRepository.findByUserOrderByEnrolledAtDesc(user).stream()
                .map(this::toResponseWithProgress)
                .toList();
    }

    @Transactional
    public EnrollmentResponse enroll(UUID courseId, String email) {
        User user = userService.findByEmail(email);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new BusinessException("This course isn't available yet");
        }
        // L1 scope: free courses only. Paid enrollment arrives with the
        // payments phase (docs/plans/learning-platform.md, phase L5).
        if (course.getPrice().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException(
                    "Paid courses aren't available for enrollment yet — check back soon");
        }
        if (enrollmentRepository.findByUserAndCourse(user, course).isPresent()) {
            throw new BusinessException("You're already enrolled in this course");
        }

        Enrollment enrollment = enrollmentRepository.save(Enrollment.builder()
                .user(user).course(course).enrolledAt(LocalDateTime.now()).build());

        events.publish(Topics.COURSE_EVENTS, "course.enrolled", enrollment.getId().toString(), Map.of(
                "userId", user.getId().toString(),
                "userEmail", user.getEmail(),
                "courseId", course.getId().toString(),
                "courseTitle", course.getTitle()
        ));

        return toResponseWithProgress(enrollment);
    }

    private EnrollmentResponse toResponseWithProgress(Enrollment enrollment) {
        var progress = lessonProgressService.buildProgress(enrollment.getCourse(), enrollment);
        return EnrollmentResponse.from(
                enrollment, progress.totalLessons(), progress.completedLessons(), progress.nextLessonId());
    }
}
