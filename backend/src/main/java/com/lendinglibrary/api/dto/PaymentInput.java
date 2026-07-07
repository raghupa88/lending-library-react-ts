package com.lendinglibrary.api.dto;

public record PaymentInput(String cardholderName, String cardNumber, String expiryMonth, String expiryYear, String cvc) {
}
