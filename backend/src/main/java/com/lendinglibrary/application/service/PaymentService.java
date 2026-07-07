package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.payment.ChargeRequest;
import com.lendinglibrary.infrastructure.payment.ChargeResult;
import com.lendinglibrary.infrastructure.payment.PaymentProvider;
import com.lendinglibrary.infrastructure.persistence.PaymentRepository;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentProvider paymentProvider;
    private final DomainEventPublisher events;

    /** Member-plan discount applied to course/batch fees — not the subscription's own price. */
    public BigDecimal priceForUser(User user, BigDecimal basePrice) {
        if (basePrice.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal discount = subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                .map(s -> discountFor(s.getPlan()))
                .orElse(BigDecimal.ZERO);
        return basePrice.multiply(BigDecimal.ONE.subtract(discount)).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal discountFor(SubscriptionPlan plan) {
        return switch (plan) {
            case PREMIUM -> new BigDecimal("0.15");
            case BASIC, ADMIN -> BigDecimal.ZERO;
        };
    }

    /**
     * Runs in its own transaction so the payment record (and its
     * success/failure event) commits regardless of what the caller does
     * next — a declined charge is followed by the caller throwing a
     * {@code BusinessException}, which must not roll back the audit trail
     * for the decline itself.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Payment charge(User user, PaymentPurpose purpose, UUID referenceId, BigDecimal amount, PaymentInput input) {
        ChargeResult result = paymentProvider.charge(
                new ChargeRequest(amount, input.cardNumber(), input.expiryMonth(), input.expiryYear(), input.cvc()));

        Payment payment = paymentRepository.save(Payment.builder()
                .user(user).purpose(purpose).referenceId(referenceId).amount(amount)
                .status(result.success() ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED)
                .providerReference(result.providerReference())
                .failureReason(result.failureReason())
                .build());

        events.publish(Topics.PAYMENT_EVENTS, result.success() ? "payment.succeeded" : "payment.failed",
                payment.getId().toString(), Map.of(
                        "userId", user.getId().toString(),
                        "userEmail", user.getEmail(),
                        "purpose", purpose.name(),
                        "referenceId", referenceId.toString(),
                        "amount", amount.toString()
                ));

        return payment;
    }
}
