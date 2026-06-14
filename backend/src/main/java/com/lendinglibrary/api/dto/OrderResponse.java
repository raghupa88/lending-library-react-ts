package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        BigDecimal totalAmount,
        String status,
        String notes,
        LocalDateTime createdAt
) {
    public static OrderResponse from(Order o) {
        return new OrderResponse(
                o.getId(),
                o.getTotalAmount(),
                o.getStatus().name().toLowerCase(),
                o.getNotes(),
                o.getCreatedAt()
        );
    }
}
