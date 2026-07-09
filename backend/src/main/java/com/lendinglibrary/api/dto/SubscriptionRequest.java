package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record SubscriptionRequest(@NotNull SubscriptionPlan plan, BillingCycle billingCycle) {
    /** Defaults to MONTHLY when omitted, matching how every subscription worked before annual billing existed. */
    public SubscriptionRequest {
        if (billingCycle == null) {
            billingCycle = BillingCycle.MONTHLY;
        }
    }
}
