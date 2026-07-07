package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.AdminAnalyticsResponse;
import com.lendinglibrary.api.dto.CompletionFunnelResponse;
import com.lendinglibrary.api.dto.CourseRevenueResponse;
import com.lendinglibrary.api.dto.DailyEnrollmentCount;
import com.lendinglibrary.domain.entity.Attendance;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.Enrollment;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.infrastructure.persistence.AttendanceRepository;
import com.lendinglibrary.infrastructure.persistence.BatchRepository;
import com.lendinglibrary.infrastructure.persistence.CertificateRepository;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.EnrollmentRepository;
import com.lendinglibrary.infrastructure.persistence.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final PaymentRepository paymentRepository;
    private final CertificateRepository certificateRepository;
    private final AttendanceRepository attendanceRepository;
    private final LessonProgressService lessonProgressService;

    public AdminAnalyticsResponse getAnalytics() {
        List<Enrollment> enrollments = enrollmentRepository.findAll();

        long started = 0;
        long completedAllLessons = 0;
        for (Enrollment enrollment : enrollments) {
            var progress = lessonProgressService.buildProgress(enrollment.getCourse(), enrollment);
            if (progress.completedLessons() > 0) {
                started++;
            }
            if (progress.totalLessons() > 0 && progress.completedLessons() == progress.totalLessons()) {
                completedAllLessons++;
            }
        }
        long certified = certificateRepository.count();

        CompletionFunnelResponse funnel =
                new CompletionFunnelResponse(enrollments.size(), started, completedAllLessons, certified);

        Map<LocalDate, Long> byDay = enrollments.stream()
                .collect(Collectors.groupingBy(e -> e.getEnrolledAt().toLocalDate(), Collectors.counting()));
        List<DailyEnrollmentCount> enrollmentsByDay = byDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(en -> new DailyEnrollmentCount(en.getKey(), en.getValue()))
                .toList();

        List<Payment> succeededPayments = paymentRepository.findAll().stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED)
                .toList();
        BigDecimal totalRevenue = succeededPayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> revenueByCourseTitle = new LinkedHashMap<>();
        for (Payment payment : succeededPayments) {
            String courseTitle = payment.getPurpose() == PaymentPurpose.COURSE_ENROLLMENT
                    ? courseRepository.findById(payment.getReferenceId()).map(Course::getTitle).orElse("Unknown course")
                    : batchRepository.findById(payment.getReferenceId())
                            .map(b -> b.getCourse().getTitle()).orElse("Unknown course");
            revenueByCourseTitle.merge(courseTitle, payment.getAmount(), BigDecimal::add);
        }
        List<CourseRevenueResponse> revenueByCourse = revenueByCourseTitle.entrySet().stream()
                .map(en -> new CourseRevenueResponse(en.getKey(), en.getValue()))
                .sorted(Comparator.comparing(CourseRevenueResponse::revenue).reversed())
                .toList();

        List<Attendance> attendance = attendanceRepository.findAll();
        double attendanceRatePercent = attendance.isEmpty()
                ? 0.0
                : 100.0 * attendance.stream().filter(Attendance::isPresent).count() / attendance.size();

        return new AdminAnalyticsResponse(
                enrollments.size(), totalRevenue, funnel, enrollmentsByDay, revenueByCourse, attendanceRatePercent);
    }
}
