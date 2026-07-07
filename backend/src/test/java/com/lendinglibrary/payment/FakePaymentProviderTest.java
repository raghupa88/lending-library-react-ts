package com.lendinglibrary.payment;

import com.lendinglibrary.infrastructure.payment.ChargeRequest;
import com.lendinglibrary.infrastructure.payment.FakePaymentProvider;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FakePaymentProviderTest {

    private final FakePaymentProvider provider = new FakePaymentProvider();

    @Test
    void charge_declinedTestCard_fails() {
        var result = provider.charge(new ChargeRequest(new BigDecimal("100.00"), "4000000000000002", "12", "2030", "123"));

        assertThat(result.success()).isFalse();
        assertThat(result.failureReason()).contains("declined");
        assertThat(result.providerReference()).isNull();
    }

    @Test
    void charge_anyOtherCard_succeeds() {
        var result = provider.charge(new ChargeRequest(new BigDecimal("100.00"), "4242424242424242", "12", "2030", "123"));

        assertThat(result.success()).isTrue();
        assertThat(result.providerReference()).startsWith("FAKE-");
        assertThat(result.failureReason()).isNull();
    }

    @Test
    void charge_declinedCardWithSpacesOrDashes_stillDetected() {
        var result = provider.charge(new ChargeRequest(new BigDecimal("100.00"), "4000-0000-0000-0002", "12", "2030", "123"));

        assertThat(result.success()).isFalse();
    }
}
