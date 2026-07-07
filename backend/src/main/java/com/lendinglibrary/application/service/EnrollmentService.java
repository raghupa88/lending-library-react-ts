package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.EnrollmentResponse;
import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.Enrollment;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
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
    private final PaymentService paymentService;

    public List<EnrollmentResponse> myEnrollments(String email) {
        User user = userService.findByEmail(email);
        return enrollmentRepository.findByUserOrderByEnrolledAtDesc(user).stream()
                .map(this::toResponseWithProgress)
                .toList();
    }

    @Transactional
    public EnrollmentResponse enroll(UUID courseId, String email, PaymentInput paymentInput) {
        User user = userService.findByEmail(email);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new BusinessException("This course isn't available yet");
        }
        if (enrollmentRepository.findByUserAndCourse(user, course).isPresent()) {
            throw new BusinessException("You're already enrolled in this course");
        }

        BigDecimal amountDue = paymentService.priceForUser(user, course.getPrice());
        if (amountDue.compareTo(BigDecimal.ZERO) > 0) {
            if (paymentInput == null) {
                throw new BusinessException("Payment details are required for this course");
            }
            Payment payment = paymentService.charge(
                    user, PaymentPurpose.COURSE_ENROLLMENT, course.getId(), amountDue, paymentInput);
            if (payment.getStatus() != PaymentStatus.SUCCEEDED) {
                throw new BusinessException(payment.getFailureReason());
            }
        }

        Enrollment enrollment = enrollmentRepository.save(Enrollment.builder()
                .user(user).course(course).enrolledAt(LocalDateTime.now()).amountPaid(amountDue).build());

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
