package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.SubscriptionRequest;
import com.lendinglibrary.application.service.SubscriptionService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock SubscriptionRepository subscriptionRepository;
    @Mock UserRepository userRepository;
    @Mock UserService userService;
    @Mock DomainEventPublisher events;
    @InjectMocks SubscriptionService subscriptionService;

    private User user;
    private Subscription active;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        active = Subscription.builder().id(UUID.randomUUID()).user(user).plan(SubscriptionPlan.BASIC)
                .monthlyPrice(new BigDecimal("199.00")).startDate(LocalDateTime.now())
                .status(SubscriptionStatus.ACTIVE).maxConcurrentLoans(3).build();
    }

    @Test
    void getCurrent_returnsActiveOrPausedSubscription() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.of(active));

        var result = subscriptionService.getCurrent("member@example.com");

        assertThat(result.status()).isEqualTo("active");
    }

    @Test
    void getCurrent_noSubscription_throws() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> subscriptionService.getCurrent("member@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void subscribe_cancelsExistingPausedSubscription() {
        active.setStatus(SubscriptionStatus.PAUSED);
        active.setPausedUntil(LocalDateTime.now().plusDays(10));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.of(active));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        var req = new SubscriptionRequest(SubscriptionPlan.PREMIUM, BillingCycle.MONTHLY);
        var result = subscriptionService.subscribe(req, "member@example.com");

        assertThat(active.getStatus()).isEqualTo(SubscriptionStatus.CANCELLED);
        assertThat(result.plan()).isEqualTo("premium");
        verify(events).publish(eq(Topics.SUBSCRIPTION_EVENTS), eq("subscription.changed"), any(), any(Map.class));
    }

    @Test
    void subscribe_annualBillingCycle_billsTenTimesMonthlyRate() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any())).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        var req = new SubscriptionRequest(SubscriptionPlan.PREMIUM, BillingCycle.ANNUAL);
        var result = subscriptionService.subscribe(req, "member@example.com");

        assertThat(result.billingCycle()).isEqualTo("annual");
        assertThat(result.totalBilled()).isEqualByComparingTo("3990.00");
    }

    @Test
    void subscribe_omittedBillingCycle_defaultsToMonthly() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any())).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        var req = new SubscriptionRequest(SubscriptionPlan.BASIC, null);
        var result = subscriptionService.subscribe(req, "member@example.com");

        assertThat(result.billingCycle()).isEqualTo("monthly");
        assertThat(result.totalBilled()).isEqualByComparingTo("199.00");
    }

    @Test
    void subscribe_partialReferralCredit_reducesTotalBilledAndCarriesRemainderToZero() {
        user.setReferralCreditBalance(new BigDecimal("50.00"));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any())).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        var req = new SubscriptionRequest(SubscriptionPlan.BASIC, BillingCycle.MONTHLY);
        var result = subscriptionService.subscribe(req, "member@example.com");

        assertThat(result.creditApplied()).isEqualByComparingTo("50.00");
        assertThat(result.totalBilled()).isEqualByComparingTo("149.00");
        assertThat(user.getReferralCreditBalance()).isEqualByComparingTo("0.00");
        verify(userRepository).save(user);
    }

    @Test
    void subscribe_creditFullyCoversBill_totalBilledZeroAndRemainderCarriesOver() {
        user.setReferralCreditBalance(new BigDecimal("500.00"));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any())).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        var req = new SubscriptionRequest(SubscriptionPlan.BASIC, BillingCycle.MONTHLY);
        var result = subscriptionService.subscribe(req, "member@example.com");

        assertThat(result.creditApplied()).isEqualByComparingTo("199.00");
        assertThat(result.totalBilled()).isEqualByComparingTo("0.00");
        assertThat(user.getReferralCreditBalance()).isEqualByComparingTo("301.00");
    }

    @Test
    void subscribe_noCreditBalance_totalBilledUnchangedAndNoUserSave() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatusIn(user,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED))).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any())).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        var req = new SubscriptionRequest(SubscriptionPlan.BASIC, BillingCycle.MONTHLY);
        var result = subscriptionService.subscribe(req, "member@example.com");

        assertThat(result.creditApplied()).isEqualByComparingTo("0.00");
        assertThat(result.totalBilled()).isEqualByComparingTo("199.00");
        verify(userRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void pause_success_setsPausedUntilOneMonthOut() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(active));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = subscriptionService.pause("member@example.com");

        assertThat(result.status()).isEqualTo("paused");
        assertThat(active.getPausedUntil()).isCloseTo(LocalDateTime.now().plusMonths(1),
                within(5, java.time.temporal.ChronoUnit.SECONDS));
        verify(events).publish(eq(Topics.SUBSCRIPTION_EVENTS), eq("subscription.paused"), any(), any(Map.class));
    }

    @Test
    void pause_noActiveSubscription_throws() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> subscriptionService.pause("member@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void resume_success_clearsPausedUntil() {
        active.setStatus(SubscriptionStatus.PAUSED);
        active.setPausedUntil(LocalDateTime.now().plusDays(20));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.PAUSED))
                .thenReturn(Optional.of(active));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = subscriptionService.resume("member@example.com");

        assertThat(result.status()).isEqualTo("active");
        assertThat(active.getPausedUntil()).isNull();
        verify(events).publish(eq(Topics.SUBSCRIPTION_EVENTS), eq("subscription.resumed"), any(), any(Map.class));
    }

    @Test
    void resume_notPaused_throws() {
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.PAUSED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> subscriptionService.resume("member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("isn't paused");
    }

    @Test
    void resumeExpiredPauses_resumesDuePausesAndSkipsOthers() {
        active.setStatus(SubscriptionStatus.PAUSED);
        active.setPausedUntil(LocalDateTime.now().minusMinutes(1));
        when(subscriptionRepository.findByStatusAndPausedUntilBefore(eq(SubscriptionStatus.PAUSED), any()))
                .thenReturn(List.of(active));

        subscriptionService.resumeExpiredPauses();

        assertThat(active.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(active.getPausedUntil()).isNull();
        verify(events).publish(eq(Topics.SUBSCRIPTION_EVENTS), eq("subscription.resumed"), any(), any(Map.class));
    }
}
