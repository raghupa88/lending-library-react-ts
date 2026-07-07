package com.lendinglibrary.infrastructure.payment;

public record ChargeResult(boolean success, String providerReference, String failureReason) {

    public static ChargeResult success(String providerReference) {
        return new ChargeResult(true, providerReference, null);
    }

    public static ChargeResult failure(String failureReason) {
        return new ChargeResult(false, null, failureReason);
    }
}
