package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.GiftPurchaseRequest;
import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.application.service.GiftService;
import com.lendinglibrary.application.service.PaymentService;
import com.lendinglibrary.application.service.SubscriptionService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.GiftSubscription;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.GiftStatus;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.GiftSubscriptionRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GiftServiceTest {

    @Mock GiftSubscriptionRepository giftSubscriptionRepository;
    @Mock UserRepository userRepository;
    @Mock UserService userService;
    @Mock SubscriptionService subscriptionService;
    @Mock PaymentService paymentService;
    @Mock DomainEventPublisher events;
    @InjectMocks GiftService giftService;

    private User purchaser;
    private PaymentInput validCard;

    @BeforeEach
    void setUp() {
        purchaser = User.builder().id(UUID.randomUUID()).email("purchaser@example.com")
                .firstName("Pat").lastName("Purchaser").role(Role.MEMBER).build();
        validCard = new PaymentInput("Pat Purchaser", "4242424242424242", "12", "2030", "123");
    }

    @Test
    void purchase_success_chargesFullBillAndReturnsGiftCode() {
        var req = new GiftPurchaseRequest("friend@example.com", SubscriptionPlan.BASIC, BillingCycle.MONTHLY, validCard);
        when(userService.findByEmail("purchaser@example.com")).thenReturn(purchaser);
        when(subscriptionService.priceFor(SubscriptionPlan.BASIC)).thenReturn(new BigDecimal("199.00"));
        when(giftSubscriptionRepository.existsByGiftCode(any())).thenReturn(false);
        when(giftSubscriptionRepository.save(any())).thenAnswer(inv -> {
            GiftSubscription g = inv.getArgument(0);
            if (g.getId() == null) g.setId(UUID.randomUUID());
            return g;
        });
        when(paymentService.charge(eq(purchaser), eq(PaymentPurpose.GIFT_SUBSCRIPTION), any(), eq(new BigDecimal("199.00")), eq(validCard)))
                .thenReturn(Payment.builder().status(PaymentStatus.SUCCEEDED).build());
        when(userRepository.findByEmail("friend@example.com")).thenReturn(Optional.empty());

        var result = giftService.purchase(req, "purchaser@example.com");

        assertThat(result.plan()).isEqualTo("basic");
        assertThat(result.amountPaid()).isEqualByComparingTo("199.00");
        assertThat(result.giftCode()).hasSize(8);
        assertThat(result.status()).isEqualTo("pending");
    }

    @Test
    void purchase_declinedPayment_throwsWithFailureReason() {
        var req = new GiftPurchaseRequest("friend@example.com", SubscriptionPlan.BASIC, BillingCycle.MONTHLY, validCard);
        when(userService.findByEmail("purchaser@example.com")).thenReturn(purchaser);
        when(subscriptionService.priceFor(SubscriptionPlan.BASIC)).thenReturn(new BigDecimal("199.00"));
        when(giftSubscriptionRepository.existsByGiftCode(any())).thenReturn(false);
        when(giftSubscriptionRepository.save(any())).thenAnswer(inv -> {
            GiftSubscription g = inv.getArgument(0);
            if (g.getId() == null) g.setId(UUID.randomUUID());
            return g;
        });
        when(paymentService.charge(any(), any(), any(), any(), any()))
                .thenReturn(Payment.builder().status(PaymentStatus.FAILED)
                        .failureReason("Your card was declined").build());

        assertThatThrownBy(() -> giftService.purchase(req, "purchaser@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("declined");
    }

    @Test
    void purchase_recipientAlreadyRegistered_notifiesThem() {
        User recipient = User.builder().id(UUID.randomUUID()).email("friend@example.com").role(Role.MEMBER).build();
        var req = new GiftPurchaseRequest("friend@example.com", SubscriptionPlan.PREMIUM, BillingCycle.ANNUAL, validCard);
        when(userService.findByEmail("purchaser@example.com")).thenReturn(purchaser);
        when(subscriptionService.priceFor(SubscriptionPlan.PREMIUM)).thenReturn(new BigDecimal("399.00"));
        when(giftSubscriptionRepository.existsByGiftCode(any())).thenReturn(false);
        when(giftSubscriptionRepository.save(any())).thenAnswer(inv -> {
            GiftSubscription g = inv.getArgument(0);
            if (g.getId() == null) g.setId(UUID.randomUUID());
            return g;
        });
        when(paymentService.charge(any(), any(), any(), any(), any()))
                .thenReturn(Payment.builder().status(PaymentStatus.SUCCEEDED).build());
        when(userRepository.findByEmail("friend@example.com")).thenReturn(Optional.of(recipient));

        giftService.purchase(req, "purchaser@example.com");

        verify(events).publish(eq(Topics.USER_EVENTS), eq("gift.received"), eq(recipient.getId().toString()), any());
    }

    @Test
    void redeem_success_activatesGiftedPlan() {
        User redeemer = User.builder().id(UUID.randomUUID()).email("friend@example.com").role(Role.MEMBER).build();
        GiftSubscription gift = GiftSubscription.builder().id(UUID.randomUUID()).purchaser(purchaser)
                .recipientEmail("friend@example.com").plan(SubscriptionPlan.PREMIUM).billingCycle(BillingCycle.MONTHLY)
                .giftCode("GIFTCODE1").amountPaid(new BigDecimal("399.00")).status(GiftStatus.PENDING)
                .purchasedAt(LocalDateTime.now()).build();
        when(giftSubscriptionRepository.findByGiftCode("GIFTCODE1")).thenReturn(Optional.of(gift));
        when(userService.findByEmail("friend@example.com")).thenReturn(redeemer);
        when(giftSubscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        SubscriptionResponse expected = SubscriptionResponse.from(
                com.lendinglibrary.domain.entity.Subscription.builder()
                        .id(UUID.randomUUID()).plan(SubscriptionPlan.PREMIUM).monthlyPrice(new BigDecimal("399.00"))
                        .billingCycle(BillingCycle.MONTHLY).startDate(LocalDateTime.now())
                        .status(com.lendinglibrary.domain.enums.SubscriptionStatus.ACTIVE).maxConcurrentLoans(Integer.MAX_VALUE)
                        .build());
        when(subscriptionService.activateGiftedPlan(redeemer, SubscriptionPlan.PREMIUM, BillingCycle.MONTHLY))
                .thenReturn(expected);

        var result = giftService.redeem("giftcode1", "friend@example.com");

        assertThat(result).isEqualTo(expected);
        assertThat(gift.getStatus()).isEqualTo(GiftStatus.REDEEMED);
        assertThat(gift.getRedeemedBy()).isEqualTo(redeemer);
        verify(events).publish(eq(Topics.USER_EVENTS), eq("gift.redeemed"), eq(purchaser.getId().toString()), any());
    }

    @Test
    void redeem_unknownCode_throws() {
        when(giftSubscriptionRepository.findByGiftCode("BADCODE1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> giftService.redeem("badcode1", "friend@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unknown gift code");
    }

    @Test
    void redeem_alreadyRedeemed_throws() {
        GiftSubscription gift = GiftSubscription.builder().id(UUID.randomUUID()).giftCode("GIFTCODE1")
                .status(GiftStatus.REDEEMED).build();
        when(giftSubscriptionRepository.findByGiftCode("GIFTCODE1")).thenReturn(Optional.of(gift));

        assertThatThrownBy(() -> giftService.redeem("giftcode1", "friend@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already been redeemed");
    }

    @Test
    void redeemAtRegistration_validCode_activatesAndReturnsGift() {
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();
        GiftSubscription gift = GiftSubscription.builder().id(UUID.randomUUID()).purchaser(purchaser)
                .recipientEmail("new@example.com").plan(SubscriptionPlan.BASIC).billingCycle(BillingCycle.MONTHLY)
                .giftCode("GIFTCODE1").amountPaid(new BigDecimal("199.00")).status(GiftStatus.PENDING)
                .purchasedAt(LocalDateTime.now()).build();
        when(giftSubscriptionRepository.findByGiftCode("GIFTCODE1")).thenReturn(Optional.of(gift));
        when(giftSubscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = giftService.redeemAtRegistration(newUser, "giftcode1");

        assertThat(result).isPresent();
        assertThat(result.get().getPlan()).isEqualTo(SubscriptionPlan.BASIC);
        assertThat(gift.getStatus()).isEqualTo(GiftStatus.REDEEMED);
        verify(subscriptionService).activateGiftedPlan(newUser, SubscriptionPlan.BASIC, BillingCycle.MONTHLY);
    }

    @Test
    void redeemAtRegistration_unknownCode_returnsEmpty_noActivation() {
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();
        when(giftSubscriptionRepository.findByGiftCode("BADCODE1")).thenReturn(Optional.empty());

        var result = giftService.redeemAtRegistration(newUser, "badcode1");

        assertThat(result).isEmpty();
        verify(subscriptionService, never()).activateGiftedPlan(any(), any(), any());
    }

    @Test
    void redeemAtRegistration_alreadyRedeemedCode_returnsEmpty_noActivation() {
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();
        GiftSubscription gift = GiftSubscription.builder().id(UUID.randomUUID()).giftCode("GIFTCODE1")
                .status(GiftStatus.REDEEMED).build();
        when(giftSubscriptionRepository.findByGiftCode("GIFTCODE1")).thenReturn(Optional.of(gift));

        var result = giftService.redeemAtRegistration(newUser, "giftcode1");

        assertThat(result).isEmpty();
        verify(subscriptionService, never()).activateGiftedPlan(any(), any(), any());
    }

    @Test
    void redeemAtRegistration_blankCode_returnsEmpty_noLookup() {
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();

        var result = giftService.redeemAtRegistration(newUser, null);

        assertThat(result).isEmpty();
        verify(giftSubscriptionRepository, never()).findByGiftCode(any());
    }
}
