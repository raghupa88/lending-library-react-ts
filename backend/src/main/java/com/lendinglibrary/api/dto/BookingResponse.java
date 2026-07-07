package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Booking;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookingResponse(
        UUID id, UUID batchId, String courseTitle, String venueName, LocalDate startsOn, LocalDate endsOn,
        String status, LocalDateTime bookedAt
) {
    public static BookingResponse from(Booking b) {
        return new BookingResponse(
                b.getId(), b.getBatch().getId(), b.getBatch().getCourse().getTitle(),
                b.getBatch().getVenue().getName(), b.getBatch().getStartsOn(), b.getBatch().getEndsOn(),
                b.getStatus().name(), b.getBookedAt()
        );
    }
}
