package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.CourseProgressResponse;
import com.lendinglibrary.application.service.AnalyticsService;
import com.lendinglibrary.application.service.LessonProgressService;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.enums.*;
import com.lendinglibrary.infrastructure.persistence.AttendanceRepository;
import com.lendinglibrary.infrastructure.persistence.BatchRepository;
import com.lendinglibrary.infrastructure.persistence.CertificateRepository;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.EnrollmentRepository;
import com.lendinglibrary.infrastructure.persistence.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock EnrollmentRepository enrollmentRepository;
    @Mock CourseRepository courseRepository;
    @Mock BatchRepository batchRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock CertificateRepository certificateRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock LessonProgressService lessonProgressService;
    @InjectMocks AnalyticsService analyticsService;

    private Course courseA;
    private Course courseB;
    private Venue venue;
    private Batch batch;
    private User learner;

    @BeforeEach
    void setUp() {
        courseA = Course.builder().id(UUID.randomUUID()).slug("course-a").title("Course A")
                .track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER).language("English")
                .price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
        courseB = Course.builder().id(UUID.randomUUID()).slug("course-b").title("Course B")
                .track(CourseTrack.EQUITIES).level(CourseLevel.BEGINNER).language("English")
                .price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
        venue = Venue.builder().id(UUID.randomUUID()).name("Suvadi Hall").city("Chennai").capacityDefault(20).build();
        batch = Batch.builder().id(UUID.randomUUID()).course(courseB).venue(venue).instructorName("Priya Raman")
                .startsOn(LocalDate.of(2026, 8, 1)).endsOn(LocalDate.of(2026, 8, 2))
                .scheduleText("Sat-Sun").capacity(10).fee(new BigDecimal("300.00")).status(BatchStatus.PUBLISHED)
                .build();
        learner = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
    }

    @Test
    void getAnalytics_aggregatesFunnelRevenueAndAttendanceFromSeededFixtures() {
        Enrollment inProgress = Enrollment.builder().id(UUID.randomUUID()).user(learner).course(courseA)
                .enrolledAt(LocalDateTime.of(2026, 7, 1, 9, 0)).build();
        Enrollment completed = Enrollment.builder().id(UUID.randomUUID()).user(learner).course(courseA)
                .enrolledAt(LocalDateTime.of(2026, 7, 1, 10, 0)).build();
        Enrollment notStarted = Enrollment.builder().id(UUID.randomUUID()).user(learner).course(courseB)
                .enrolledAt(LocalDateTime.of(2026, 7, 2, 9, 0)).build();
        when(enrollmentRepository.findAll()).thenReturn(List.of(inProgress, completed, notStarted));

        when(lessonProgressService.buildProgress(eq(courseA), eq(inProgress))).thenReturn(
                new CourseProgressResponse(courseA.getId(), 5, 2, List.of(), UUID.randomUUID()));
        when(lessonProgressService.buildProgress(eq(courseA), eq(completed))).thenReturn(
                new CourseProgressResponse(courseA.getId(), 3, 3, List.of(), null));
        when(lessonProgressService.buildProgress(eq(courseB), eq(notStarted))).thenReturn(
                new CourseProgressResponse(courseB.getId(), 4, 0, List.of(), UUID.randomUUID()));

        when(certificateRepository.count()).thenReturn(2L);

        Payment coursePayment = Payment.builder().id(UUID.randomUUID()).user(learner)
                .purpose(PaymentPurpose.COURSE_ENROLLMENT).referenceId(courseA.getId())
                .amount(new BigDecimal("500.00")).status(PaymentStatus.SUCCEEDED).build();
        Payment batchPayment = Payment.builder().id(UUID.randomUUID()).user(learner)
                .purpose(PaymentPurpose.BATCH_BOOKING).referenceId(batch.getId())
                .amount(new BigDecimal("300.00")).status(PaymentStatus.SUCCEEDED).build();
        Payment declinedPayment = Payment.builder().id(UUID.randomUUID()).user(learner)
                .purpose(PaymentPurpose.COURSE_ENROLLMENT).referenceId(courseA.getId())
                .amount(new BigDecimal("500.00")).status(PaymentStatus.FAILED).build();
        when(paymentRepository.findAll()).thenReturn(List.of(coursePayment, batchPayment, declinedPayment));
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));

        Attendance present1 = Attendance.builder().present(true).build();
        Attendance present2 = Attendance.builder().present(true).build();
        Attendance absent = Attendance.builder().present(false).build();
        when(attendanceRepository.findAll()).thenReturn(List.of(present1, present2, absent));

        var result = analyticsService.getAnalytics();

        assertThat(result.totalEnrollments()).isEqualTo(3);
        assertThat(result.completionFunnel().enrolled()).isEqualTo(3);
        assertThat(result.completionFunnel().startedLesson()).isEqualTo(2);
        assertThat(result.completionFunnel().completedAllLessons()).isEqualTo(1);
        assertThat(result.completionFunnel().certified()).isEqualTo(2);

        assertThat(result.enrollmentsByDay()).hasSize(2);
        assertThat(result.enrollmentsByDay().get(0).date()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(result.enrollmentsByDay().get(0).count()).isEqualTo(2);
        assertThat(result.enrollmentsByDay().get(1).date()).isEqualTo(LocalDate.of(2026, 7, 2));
        assertThat(result.enrollmentsByDay().get(1).count()).isEqualTo(1);

        assertThat(result.totalRevenue()).isEqualByComparingTo("800.00");
        assertThat(result.revenueByCourse()).hasSize(2);
        assertThat(result.revenueByCourse().get(0).courseTitle()).isEqualTo("Course A");
        assertThat(result.revenueByCourse().get(0).revenue()).isEqualByComparingTo("500.00");
        assertThat(result.revenueByCourse().get(1).courseTitle()).isEqualTo("Course B");
        assertThat(result.revenueByCourse().get(1).revenue()).isEqualByComparingTo("300.00");

        assertThat(result.attendanceRatePercent()).isCloseTo(66.67, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void getAnalytics_noData_returnsZeroedAggregatesWithoutDivideByZero() {
        when(enrollmentRepository.findAll()).thenReturn(List.of());
        when(certificateRepository.count()).thenReturn(0L);
        when(paymentRepository.findAll()).thenReturn(List.of());
        when(attendanceRepository.findAll()).thenReturn(List.of());

        var result = analyticsService.getAnalytics();

        assertThat(result.totalEnrollments()).isZero();
        assertThat(result.totalRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.enrollmentsByDay()).isEmpty();
        assertThat(result.revenueByCourse()).isEmpty();
        assertThat(result.attendanceRatePercent()).isZero();
    }

    @Test
    void getAnalytics_paymentForDeletedCourse_fallsBackToUnknownCourseLabel() {
        when(enrollmentRepository.findAll()).thenReturn(List.of());
        when(certificateRepository.count()).thenReturn(0L);
        when(attendanceRepository.findAll()).thenReturn(List.of());

        UUID missingCourseId = UUID.randomUUID();
        Payment orphanPayment = Payment.builder().id(UUID.randomUUID()).user(learner)
                .purpose(PaymentPurpose.COURSE_ENROLLMENT).referenceId(missingCourseId)
                .amount(new BigDecimal("100.00")).status(PaymentStatus.SUCCEEDED).build();
        when(paymentRepository.findAll()).thenReturn(List.of(orphanPayment));
        when(courseRepository.findById(missingCourseId)).thenReturn(Optional.empty());

        var result = analyticsService.getAnalytics();

        assertThat(result.revenueByCourse()).hasSize(1);
        assertThat(result.revenueByCourse().get(0).courseTitle()).isEqualTo("Unknown course");
    }
}
