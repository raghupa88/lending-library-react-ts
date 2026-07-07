package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Batch;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record AdminBatchSummaryResponse(
        UUID id, String venueName, String instructorName, LocalDate startsOn, LocalDate endsOn,
        String scheduleText, int capacity, BigDecimal fee, String status,
        long confirmedCount, long waitlistedCount
) {
    public static AdminBatchSummaryResponse from(Batch b, long confirmedCount, long waitlistedCount) {
        return new AdminBatchSummaryResponse(
                b.getId(), b.getVenue().getName(), b.getInstructorName(), b.getStartsOn(), b.getEndsOn(),
                b.getScheduleText(), b.getCapacity(), b.getFee(), b.getStatus().name(),
                confirmedCount, waitlistedCount
        );
    }
}
