package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GiftPurchaseRequest(
        @Email @NotBlank String recipientEmail,
        @NotNull SubscriptionPlan plan,
        BillingCycle billingCycle,
        @NotNull PaymentInput payment
) {
    /** Defaults to MONTHLY when omitted, matching SubscriptionRequest. */
    public GiftPurchaseRequest {
        if (billingCycle == null) {
            billingCycle = BillingCycle.MONTHLY;
        }
    }
}
