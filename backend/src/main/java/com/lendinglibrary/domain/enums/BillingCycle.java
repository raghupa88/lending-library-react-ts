package com.lendinglibrary.domain.enums;

import java.math.BigDecimal;

public enum BillingCycle {
    MONTHLY, ANNUAL;

    /** Annual bills 10x the monthly rate — two months free versus paying monthly all year. */
    public BigDecimal totalBilled(BigDecimal monthlyPrice) {
        return switch (this) {
            case MONTHLY -> monthlyPrice;
            case ANNUAL -> monthlyPrice.multiply(BigDecimal.TEN);
        };
    }
}
