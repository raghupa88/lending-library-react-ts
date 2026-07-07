package com.lendinglibrary.infrastructure.payment;

/**
 * Port for card processing. {@link FakePaymentProvider} is the only
 * implementation for now (see docs/adr for the L5 payments scope) — a real
 * provider (e.g. Razorpay test mode) would implement this same interface
 * with no changes needed in {@code PaymentService} or its callers.
 */
public interface PaymentProvider {

    ChargeResult charge(ChargeRequest request);
}
