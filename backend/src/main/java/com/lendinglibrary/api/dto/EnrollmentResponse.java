package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Enrollment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record EnrollmentResponse(
        UUID id,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        String status,
        LocalDateTime enrolledAt,
        long totalLessons,
        long completedLessons,
        UUID nextLessonId,
        BigDecimal amountPaid
) {
    public static EnrollmentResponse from(
            Enrollment e, long totalLessons, long completedLessons, UUID nextLessonId) {
        return new EnrollmentResponse(
                e.getId(), e.getCourse().getId(), e.getCourse().getSlug(),
                e.getCourse().getTitle(), e.getStatus().name(), e.getEnrolledAt(),
                totalLessons, completedLessons, nextLessonId, e.getAmountPaid()
        );
    }
}
