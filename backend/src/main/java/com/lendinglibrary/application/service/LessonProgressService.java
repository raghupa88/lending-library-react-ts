package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.CourseProgressResponse;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.CourseModuleRepository;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.EnrollmentRepository;
import com.lendinglibrary.infrastructure.persistence.LessonProgressRepository;
import com.lendinglibrary.infrastructure.persistence.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LessonProgressService {

    private final LessonRepository lessonRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository courseModuleRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final UserService userService;

    @Transactional
    public CourseProgressResponse completeLesson(UUID lessonId, String email) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + lessonId));
        Course course = lesson.getModule().getCourse();
        Enrollment enrollment = requireEnrollment(course, email);

        if (lessonProgressRepository.findByEnrollmentAndLesson(enrollment, lesson).isEmpty()) {
            lessonProgressRepository.save(LessonProgress.builder()
                    .enrollment(enrollment).lesson(lesson).completedAt(LocalDateTime.now()).build());
        }

        return buildProgress(course, enrollment);
    }

    public CourseProgressResponse getProgress(UUID courseId, String email) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        Enrollment enrollment = requireEnrollment(course, email);
        return buildProgress(course, enrollment);
    }

    /** Used by EnrollmentService to attach a progress summary to each listed enrollment. */
    public CourseProgressResponse buildProgress(Course course, Enrollment enrollment) {
        List<Lesson> orderedLessons = courseModuleRepository.findByCourseOrderBySortOrderAsc(course).stream()
                .flatMap(module -> lessonRepository.findByModuleOrderBySortOrderAsc(module).stream())
                .toList();

        Set<UUID> completedIds = lessonProgressRepository.findByEnrollment(enrollment).stream()
                .map(p -> p.getLesson().getId())
                .collect(Collectors.toSet());

        UUID nextLessonId = orderedLessons.stream()
                .map(Lesson::getId)
                .filter(id -> !completedIds.contains(id))
                .findFirst()
                .orElse(null);

        List<UUID> completedLessonIds = orderedLessons.stream()
                .map(Lesson::getId)
                .filter(completedIds::contains)
                .toList();

        return new CourseProgressResponse(
                course.getId(), orderedLessons.size(), completedLessonIds.size(),
                completedLessonIds, nextLessonId
        );
    }

    private Enrollment requireEnrollment(Course course, String email) {
        User user = userService.findByEmail(email);
        return enrollmentRepository.findByUserAndCourse(user, course)
                .orElseThrow(() -> new BusinessException("You must enroll in this course first"));
    }
}
