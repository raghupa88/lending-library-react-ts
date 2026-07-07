package com.lendinglibrary.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record AdminAnalyticsResponse(
        long totalEnrollments,
        BigDecimal totalRevenue,
        CompletionFunnelResponse completionFunnel,
        List<DailyEnrollmentCount> enrollmentsByDay,
        List<CourseRevenueResponse> revenueByCourse,
        double attendanceRatePercent
) {
}
