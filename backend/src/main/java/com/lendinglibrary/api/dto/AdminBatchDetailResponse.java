package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Batch;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AdminBatchDetailResponse(
        UUID id, String venueName, String instructorName, LocalDate startsOn, LocalDate endsOn,
        String scheduleText, int capacity, BigDecimal fee, String status,
        List<SessionResponse> sessions, List<RosterEntryResponse> roster
) {
    public static AdminBatchDetailResponse from(
            Batch b, List<SessionResponse> sessions, List<RosterEntryResponse> roster) {
        return new AdminBatchDetailResponse(
                b.getId(), b.getVenue().getName(), b.getInstructorName(), b.getStartsOn(), b.getEndsOn(),
                b.getScheduleText(), b.getCapacity(), b.getFee(), b.getStatus().name(), sessions, roster
        );
    }
}
