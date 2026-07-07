package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.application.service.PaymentService;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.payment.ChargeResult;
import com.lendinglibrary.infrastructure.payment.PaymentProvider;
import com.lendinglibrary.infrastructure.persistence.PaymentRepository;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock PaymentRepository paymentRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock PaymentProvider paymentProvider;
    @Mock DomainEventPublisher events;
    @InjectMocks PaymentService paymentService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
    }

    @Test
    void priceForUser_zeroBasePrice_shortCircuitsToZero() {
        var result = paymentService.priceForUser(user, BigDecimal.ZERO);

        assertThat(result).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void priceForUser_noActiveSubscription_fullPrice() {
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.empty());

        var result = paymentService.priceForUser(user, new BigDecimal("999.00"));

        assertThat(result).isEqualByComparingTo("999.00");
    }

    @Test
    void priceForUser_basicPlan_noDiscount() {
        Subscription sub = Subscription.builder().plan(SubscriptionPlan.BASIC).build();
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(sub));

        var result = paymentService.priceForUser(user, new BigDecimal("999.00"));

        assertThat(result).isEqualByComparingTo("999.00");
    }

    @Test
    void priceForUser_premiumPlan_appliesFifteenPercentDiscount() {
        Subscription sub = Subscription.builder().plan(SubscriptionPlan.PREMIUM).build();
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(sub));

        var result = paymentService.priceForUser(user, new BigDecimal("1000.00"));

        assertThat(result).isEqualByComparingTo("850.00");
    }

    @Test
    void charge_successfulPayment_persistsSucceededPaymentAndPublishesEvent() {
        UUID courseId = UUID.randomUUID();
        PaymentInput input = new PaymentInput("Test Member", "4242424242424242", "12", "2030", "123");
        when(paymentProvider.charge(any())).thenReturn(ChargeResult.success("FAKE-ABC12345"));
        when(paymentRepository.save(any())).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        var result = paymentService.charge(
                user, PaymentPurpose.COURSE_ENROLLMENT, courseId, new BigDecimal("999.00"), input);

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(result.getProviderReference()).isEqualTo("FAKE-ABC12345");
        verify(events).publish(eq(Topics.PAYMENT_EVENTS), eq("payment.succeeded"), any(), any(Map.class));
    }

    @Test
    void charge_declinedPayment_persistsFailedPaymentAndPublishesFailureEvent() {
        UUID batchId = UUID.randomUUID();
        PaymentInput input = new PaymentInput("Test Member", "4000000000000002", "12", "2030", "123");
        when(paymentProvider.charge(any())).thenReturn(ChargeResult.failure("Your card was declined"));
        when(paymentRepository.save(any())).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        var result = paymentService.charge(
                user, PaymentPurpose.BATCH_BOOKING, batchId, new BigDecimal("500.00"), input);

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(result.getFailureReason()).contains("declined");
        verify(events).publish(eq(Topics.PAYMENT_EVENTS), eq("payment.failed"), any(), any(Map.class));
    }
}
