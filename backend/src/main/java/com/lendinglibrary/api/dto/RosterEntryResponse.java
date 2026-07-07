package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Booking;

import java.time.LocalDateTime;
import java.util.UUID;

public record RosterEntryResponse(
        UUID bookingId, UUID userId, String userName, String userEmail, String status, LocalDateTime bookedAt
) {
    public static RosterEntryResponse from(Booking b) {
        return new RosterEntryResponse(
                b.getId(), b.getUser().getId(),
                b.getUser().getFirstName() + " " + b.getUser().getLastName(),
                b.getUser().getEmail(), b.getStatus().name(), b.getBookedAt()
        );
    }
}
