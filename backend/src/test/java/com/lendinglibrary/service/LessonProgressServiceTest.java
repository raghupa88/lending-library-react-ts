package com.lendinglibrary.service;

import com.lendinglibrary.application.service.LessonProgressService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.enums.LessonKind;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.CourseModuleRepository;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.EnrollmentRepository;
import com.lendinglibrary.infrastructure.persistence.LessonProgressRepository;
import com.lendinglibrary.infrastructure.persistence.LessonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LessonProgressServiceTest {

    @Mock LessonRepository lessonRepository;
    @Mock CourseRepository courseRepository;
    @Mock CourseModuleRepository courseModuleRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock LessonProgressRepository lessonProgressRepository;
    @Mock UserService userService;
    @InjectMocks LessonProgressService lessonProgressService;

    private User user;
    private Course course;
    private CourseModule module1;
    private CourseModule module2;
    private Lesson lesson1;
    private Lesson lesson2;
    private Lesson lesson3;
    private Enrollment enrollment;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        course = Course.builder().id(UUID.randomUUID()).slug("money-foundations")
                .title("Money Foundations").track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
        module1 = CourseModule.builder().id(UUID.randomUUID()).course(course).title("Module 1").sortOrder(0).build();
        module2 = CourseModule.builder().id(UUID.randomUUID()).course(course).title("Module 2").sortOrder(1).build();
        lesson1 = Lesson.builder().id(UUID.randomUUID()).module(module1).title("Lesson 1")
                .kind(LessonKind.ARTICLE).sortOrder(0).build();
        lesson2 = Lesson.builder().id(UUID.randomUUID()).module(module1).title("Lesson 2")
                .kind(LessonKind.ARTICLE).sortOrder(1).build();
        lesson3 = Lesson.builder().id(UUID.randomUUID()).module(module2).title("Lesson 3")
                .kind(LessonKind.ARTICLE).sortOrder(0).build();
        enrollment = Enrollment.builder().id(UUID.randomUUID()).user(user).course(course).build();
    }

    @Test
    void completeLesson_notEnrolled_throws() {
        when(lessonRepository.findById(lesson1.getId())).thenReturn(Optional.of(lesson1));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lessonProgressService.completeLesson(lesson1.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("enroll");
    }

    @Test
    void completeLesson_lessonNotFound_throws() {
        UUID id = UUID.randomUUID();
        when(lessonRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lessonProgressService.completeLesson(id, "member@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void completeLesson_success_recordsProgressAndComputesNextLesson() {
        when(lessonRepository.findById(lesson1.getId())).thenReturn(Optional.of(lesson1));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.findByEnrollmentAndLesson(enrollment, lesson1)).thenReturn(Optional.empty());
        when(courseModuleRepository.findByCourseOrderBySortOrderAsc(course)).thenReturn(List.of(module1, module2));
        when(lessonRepository.findByModuleOrderBySortOrderAsc(module1)).thenReturn(List.of(lesson1, lesson2));
        when(lessonRepository.findByModuleOrderBySortOrderAsc(module2)).thenReturn(List.of(lesson3));
        when(lessonProgressRepository.findByEnrollment(enrollment)).thenReturn(List.of(
                LessonProgress.builder().lesson(lesson1).build()));

        var result = lessonProgressService.completeLesson(lesson1.getId(), "member@example.com");

        assertThat(result.totalLessons()).isEqualTo(3);
        assertThat(result.completedLessons()).isEqualTo(1);
        assertThat(result.nextLessonId()).isEqualTo(lesson2.getId());
    }

    @Test
    void completeLesson_alreadyCompleted_isIdempotent() {
        when(lessonRepository.findById(lesson1.getId())).thenReturn(Optional.of(lesson1));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.findByEnrollmentAndLesson(enrollment, lesson1)).thenReturn(
                Optional.of(LessonProgress.builder().lesson(lesson1).build()));
        when(courseModuleRepository.findByCourseOrderBySortOrderAsc(course)).thenReturn(List.of(module1, module2));
        when(lessonRepository.findByModuleOrderBySortOrderAsc(module1)).thenReturn(List.of(lesson1, lesson2));
        when(lessonRepository.findByModuleOrderBySortOrderAsc(module2)).thenReturn(List.of(lesson3));
        when(lessonProgressRepository.findByEnrollment(enrollment)).thenReturn(List.of(
                LessonProgress.builder().lesson(lesson1).build()));

        lessonProgressService.completeLesson(lesson1.getId(), "member@example.com");

        org.mockito.Mockito.verify(lessonProgressRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void getProgress_allLessonsComplete_nextLessonIsNull() {
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(courseModuleRepository.findByCourseOrderBySortOrderAsc(course)).thenReturn(List.of(module1));
        when(lessonRepository.findByModuleOrderBySortOrderAsc(module1)).thenReturn(List.of(lesson1));
        when(lessonProgressRepository.findByEnrollment(enrollment)).thenReturn(List.of(
                LessonProgress.builder().lesson(lesson1).build()));

        var result = lessonProgressService.getProgress(course.getId(), "member@example.com");

        assertThat(result.completedLessons()).isEqualTo(result.totalLessons());
        assertThat(result.nextLessonId()).isNull();
    }

    @Test
    void getProgress_courseNotFound_throws() {
        UUID id = UUID.randomUUID();
        when(courseRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lessonProgressService.getProgress(id, "member@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
