package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Batch;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BatchForLearnerResponse(
        UUID id, String venueName, String city, String instructorName, LocalDate startsOn, LocalDate endsOn,
        String scheduleText, BigDecimal fee, int seatsAvailable, String myBookingStatus
) {
    public static BatchForLearnerResponse from(Batch b, int seatsAvailable, String myBookingStatus) {
        return new BatchForLearnerResponse(
                b.getId(), b.getVenue().getName(), b.getVenue().getCity(), b.getInstructorName(),
                b.getStartsOn(), b.getEndsOn(), b.getScheduleText(), b.getFee(), seatsAvailable, myBookingStatus
        );
    }
}
