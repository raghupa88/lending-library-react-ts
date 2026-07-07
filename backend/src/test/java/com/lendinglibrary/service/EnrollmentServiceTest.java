package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.CourseProgressResponse;
import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.application.service.EnrollmentService;
import com.lendinglibrary.application.service.LessonProgressService;
import com.lendinglibrary.application.service.PaymentService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.Enrollment;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.EnrollmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnrollmentServiceTest {

    @Mock EnrollmentRepository enrollmentRepository;
    @Mock CourseRepository courseRepository;
    @Mock UserService userService;
    @Mock DomainEventPublisher events;
    @Mock LessonProgressService lessonProgressService;
    @Mock PaymentService paymentService;
    @InjectMocks EnrollmentService enrollmentService;

    private User user;
    private Course publishedFreeCourse;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        publishedFreeCourse = Course.builder().id(UUID.randomUUID()).slug("money-foundations")
                .title("Money Foundations").track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
    }

    @Test
    void enroll_success_publishesCourseEnrolledEvent() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(courseRepository.findById(publishedFreeCourse.getId())).thenReturn(Optional.of(publishedFreeCourse));
        when(enrollmentRepository.findByUserAndCourse(user, publishedFreeCourse)).thenReturn(Optional.empty());
        when(paymentService.priceForUser(user, BigDecimal.ZERO)).thenReturn(BigDecimal.ZERO);
        when(enrollmentRepository.save(any())).thenAnswer(inv -> {
            Enrollment e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });
        when(lessonProgressService.buildProgress(eq(publishedFreeCourse), any())).thenReturn(
                new CourseProgressResponse(publishedFreeCourse.getId(), 6, 0, List.of(), UUID.randomUUID()));

        var result = enrollmentService.enroll(publishedFreeCourse.getId(), "member@example.com", null);

        assertThat(result.courseTitle()).isEqualTo("Money Foundations");
        assertThat(result.totalLessons()).isEqualTo(6);
        verify(events).publish(eq(Topics.COURSE_EVENTS), eq("course.enrolled"), any(), any(Map.class));
    }

    @Test
    void enroll_alreadyEnrolled_throws() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(courseRepository.findById(publishedFreeCourse.getId())).thenReturn(Optional.of(publishedFreeCourse));
        when(enrollmentRepository.findByUserAndCourse(user, publishedFreeCourse))
                .thenReturn(Optional.of(Enrollment.builder().build()));

        assertThatThrownBy(() -> enrollmentService.enroll(publishedFreeCourse.getId(), "member@example.com", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already enrolled");
    }

    @Test
    void enroll_paidCourse_withoutPaymentDetails_throws() {
        publishedFreeCourse.setPrice(new BigDecimal("999.00"));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(courseRepository.findById(publishedFreeCourse.getId())).thenReturn(Optional.of(publishedFreeCourse));
        when(enrollmentRepository.findByUserAndCourse(user, publishedFreeCourse)).thenReturn(Optional.empty());
        when(paymentService.priceForUser(user, new BigDecimal("999.00"))).thenReturn(new BigDecimal("999.00"));

        assertThatThrownBy(() -> enrollmentService.enroll(publishedFreeCourse.getId(), "member@example.com", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Payment details are required");
    }

    @Test
    void enroll_paidCourse_successfulPayment_enrolls() {
        publishedFreeCourse.setPrice(new BigDecimal("999.00"));
        PaymentInput input = new PaymentInput("Test Member", "4242424242424242", "12", "2030", "123");
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(courseRepository.findById(publishedFreeCourse.getId())).thenReturn(Optional.of(publishedFreeCourse));
        when(enrollmentRepository.findByUserAndCourse(user, publishedFreeCourse)).thenReturn(Optional.empty());
        when(paymentService.priceForUser(user, new BigDecimal("999.00"))).thenReturn(new BigDecimal("999.00"));
        when(paymentService.charge(user, com.lendinglibrary.domain.enums.PaymentPurpose.COURSE_ENROLLMENT,
                publishedFreeCourse.getId(), new BigDecimal("999.00"), input))
                .thenReturn(Payment.builder().status(PaymentStatus.SUCCEEDED).build());
        when(enrollmentRepository.save(any())).thenAnswer(inv -> {
            Enrollment e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });
        when(lessonProgressService.buildProgress(eq(publishedFreeCourse), any())).thenReturn(
                new CourseProgressResponse(publishedFreeCourse.getId(), 6, 0, List.of(), UUID.randomUUID()));

        var result = enrollmentService.enroll(publishedFreeCourse.getId(), "member@example.com", input);

        assertThat(result.amountPaid()).isEqualByComparingTo("999.00");
    }

    @Test
    void enroll_paidCourse_declinedPayment_throws() {
        publishedFreeCourse.setPrice(new BigDecimal("999.00"));
        PaymentInput input = new PaymentInput("Test Member", "4000000000000002", "12", "2030", "123");
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(courseRepository.findById(publishedFreeCourse.getId())).thenReturn(Optional.of(publishedFreeCourse));
        when(enrollmentRepository.findByUserAndCourse(user, publishedFreeCourse)).thenReturn(Optional.empty());
        when(paymentService.priceForUser(user, new BigDecimal("999.00"))).thenReturn(new BigDecimal("999.00"));
        when(paymentService.charge(user, com.lendinglibrary.domain.enums.PaymentPurpose.COURSE_ENROLLMENT,
                publishedFreeCourse.getId(), new BigDecimal("999.00"), input))
                .thenReturn(Payment.builder().status(PaymentStatus.FAILED).failureReason("Your card was declined").build());

        assertThatThrownBy(() -> enrollmentService.enroll(publishedFreeCourse.getId(), "member@example.com", input))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("declined");
    }

    @Test
    void enroll_draftCourse_rejected() {
        publishedFreeCourse.setStatus(CourseStatus.DRAFT);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(courseRepository.findById(publishedFreeCourse.getId())).thenReturn(Optional.of(publishedFreeCourse));

        assertThatThrownBy(() -> enrollmentService.enroll(publishedFreeCourse.getId(), "member@example.com", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("isn't available");
    }

    @Test
    void enroll_courseNotFound_throws() {
        UUID id = UUID.randomUUID();
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(courseRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> enrollmentService.enroll(id, "member@example.com", null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void myEnrollments_attachesProgressSummaryPerEnrollment() {
        Enrollment enrollment = Enrollment.builder().id(UUID.randomUUID())
                .user(user).course(publishedFreeCourse).build();
        UUID nextLessonId = UUID.randomUUID();
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserOrderByEnrolledAtDesc(user)).thenReturn(List.of(enrollment));
        when(lessonProgressService.buildProgress(publishedFreeCourse, enrollment)).thenReturn(
                new CourseProgressResponse(publishedFreeCourse.getId(), 6, 2, List.of(), nextLessonId));

        var result = enrollmentService.myEnrollments("member@example.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).totalLessons()).isEqualTo(6);
        assertThat(result.get(0).completedLessons()).isEqualTo(2);
        assertThat(result.get(0).nextLessonId()).isEqualTo(nextLessonId);
    }
}
