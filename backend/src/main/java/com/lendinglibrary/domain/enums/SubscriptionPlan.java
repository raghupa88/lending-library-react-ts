package com.lendinglibrary.domain.enums;

public enum SubscriptionPlan {
    BASIC, PREMIUM, ADMIN;

    public int maxConcurrentLoans() {
        return switch (this) {
            case BASIC -> 3;
            case PREMIUM, ADMIN -> Integer.MAX_VALUE;
        };
    }

    public String displayName() {
        return name().charAt(0) + name().substring(1).toLowerCase();
    }
}
