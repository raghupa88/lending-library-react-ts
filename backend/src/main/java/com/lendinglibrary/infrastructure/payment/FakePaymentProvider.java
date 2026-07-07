package com.lendinglibrary.infrastructure.payment;

import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Simulates a card processor with no real network call. Deliberately reuses
 * Stripe's well-known "always declined" test card number
 * (4000000000000002) as the one deterministic failure trigger, so both this
 * class and the e2e checkout-failure spec can exercise the same documented
 * value instead of an ad-hoc magic number.
 */
@Component
public class FakePaymentProvider implements PaymentProvider {

    private static final String ALWAYS_DECLINED_CARD = "4000000000000002";

    @Override
    public ChargeResult charge(ChargeRequest request) {
        String cardNumber = request.cardNumber() == null ? "" : request.cardNumber().replaceAll("\\s|-", "");
        if (ALWAYS_DECLINED_CARD.equals(cardNumber)) {
            return ChargeResult.failure("Your card was declined — please try a different card");
        }
        return ChargeResult.success("FAKE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }
}
