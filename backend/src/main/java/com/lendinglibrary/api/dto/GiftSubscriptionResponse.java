package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.GiftSubscription;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record GiftSubscriptionResponse(
        UUID id,
        String recipientEmail,
        String plan,
        String billingCycle,
        String giftCode,
        BigDecimal amountPaid,
        String status,
        LocalDateTime purchasedAt,
        LocalDateTime redeemedAt
) {
    public static GiftSubscriptionResponse from(GiftSubscription g) {
        return new GiftSubscriptionResponse(
                g.getId(),
                g.getRecipientEmail(),
                g.getPlan().name().toLowerCase(),
                g.getBillingCycle().name().toLowerCase(),
                g.getGiftCode(),
                g.getAmountPaid(),
                g.getStatus().name().toLowerCase(),
                g.getPurchasedAt(),
                g.getRedeemedAt()
        );
    }
}
