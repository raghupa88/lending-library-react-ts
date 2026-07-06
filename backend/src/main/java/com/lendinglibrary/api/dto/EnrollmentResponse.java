package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Enrollment;

import java.time.LocalDateTime;
import java.util.UUID;

public record EnrollmentResponse(
        UUID id,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        String status,
        LocalDateTime enrolledAt
) {
    public static EnrollmentResponse from(Enrollment e) {
        return new EnrollmentResponse(
                e.getId(), e.getCourse().getId(), e.getCourse().getSlug(),
                e.getCourse().getTitle(), e.getStatus().name(), e.getEnrolledAt()
        );
    }
}
