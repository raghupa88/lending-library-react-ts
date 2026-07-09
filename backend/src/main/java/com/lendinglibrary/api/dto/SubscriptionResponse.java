package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Subscription;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record SubscriptionResponse(
        UUID id,
        String plan,
        BigDecimal monthlyPrice,
        LocalDateTime startDate,
        LocalDateTime endDate,
        String status,
        int maxConcurrentLoans,
        LocalDateTime pausedUntil,
        String billingCycle,
        BigDecimal totalBilled
) {
    public static SubscriptionResponse from(Subscription s) {
        return new SubscriptionResponse(
                s.getId(),
                s.getPlan().name().toLowerCase(),
                s.getMonthlyPrice(),
                s.getStartDate(),
                s.getEndDate(),
                s.getStatus().name().toLowerCase(),
                s.getMaxConcurrentLoans(),
                s.getPausedUntil(),
                s.getBillingCycle().name().toLowerCase(),
                s.getBillingCycle().totalBilled(s.getMonthlyPrice())
        );
    }
}
