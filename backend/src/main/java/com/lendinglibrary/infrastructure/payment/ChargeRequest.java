package com.lendinglibrary.infrastructure.payment;

import java.math.BigDecimal;

public record ChargeRequest(
        BigDecimal amount, String cardNumber, String expiryMonth, String expiryYear, String cvc) {
}
