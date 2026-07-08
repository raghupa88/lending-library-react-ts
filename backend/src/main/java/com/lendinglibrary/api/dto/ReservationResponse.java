package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Reservation;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReservationResponse(
        UUID id,
        UUID bookId,
        String bookTitle,
        String bookCover,
        String status,
        LocalDateTime reservedAt,
        LocalDateTime holdExpiresAt
) {
    public static ReservationResponse from(Reservation r) {
        return new ReservationResponse(
                r.getId(), r.getBook().getId(), r.getBook().getTitle(), r.getBook().getCoverUrl(),
                r.getStatus().name(), r.getReservedAt(), r.getHoldExpiresAt()
        );
    }
}
