package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OrganizationPurchaseRequest(
        @NotBlank String name,
        @NotNull SubscriptionPlan plan,
        BillingCycle billingCycle,
        @Min(1) int seatCount,
        @NotNull PaymentInput payment
) {
    /** Defaults to MONTHLY when omitted, matching SubscriptionRequest/GiftPurchaseRequest. */
    public OrganizationPurchaseRequest {
        if (billingCycle == null) {
            billingCycle = BillingCycle.MONTHLY;
        }
    }
}
