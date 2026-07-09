package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.GiftPurchaseRequest;
import com.lendinglibrary.api.dto.GiftSubscriptionResponse;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.domain.entity.GiftSubscription;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.GiftStatus;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.GiftSubscriptionRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * A member buys a plan for someone else and pays for it now via the fake
 * payment provider (a real purchase, unlike {@link SubscriptionService#subscribe}
 * which has never charged anyone — see ADR-020/021). The recipient redeems
 * the resulting code separately, either at registration (new recipient) or
 * via {@link #redeem} (existing member) — see ADR-022.
 */
@Service
@RequiredArgsConstructor
public class GiftService {

    private static final int GIFT_CODE_LENGTH = 8;
    private static final int GIFT_CODE_MAX_ATTEMPTS = 5;

    private final GiftSubscriptionRepository giftSubscriptionRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final SubscriptionService subscriptionService;
    private final PaymentService paymentService;
    private final DomainEventPublisher events;

    @Transactional
    public GiftSubscriptionResponse purchase(GiftPurchaseRequest req, String purchaserEmail) {
        User purchaser = userService.findByEmail(purchaserEmail);
        BigDecimal amount = req.billingCycle().totalBilled(subscriptionService.priceFor(req.plan()));

        GiftSubscription gift = giftSubscriptionRepository.save(GiftSubscription.builder()
                .purchaser(purchaser)
                .recipientEmail(req.recipientEmail())
                .plan(req.plan())
                .billingCycle(req.billingCycle())
                .giftCode(generateUniqueGiftCode())
                .amountPaid(amount)
                .status(GiftStatus.PENDING)
                .purchasedAt(LocalDateTime.now())
                .build());

        Payment payment = paymentService.charge(
                purchaser, PaymentPurpose.GIFT_SUBSCRIPTION, gift.getId(), amount, req.payment());
        if (payment.getStatus() != PaymentStatus.SUCCEEDED) {
            throw new BusinessException(payment.getFailureReason());
        }

        // Best-effort: only a recipient who's already a registered member can
        // be notified in-app/by-email right now; an unregistered recipient
        // simply gets the code shared with them directly by the purchaser.
        userRepository.findByEmail(req.recipientEmail()).ifPresent(recipient ->
                events.publish(Topics.USER_EVENTS, "gift.received", recipient.getId().toString(), Map.of(
                        "userId", recipient.getId().toString(),
                        "userEmail", recipient.getEmail(),
                        "purchaserName", purchaser.getFirstName() + " " + purchaser.getLastName(),
                        "plan", gift.getPlan().name(),
                        "giftCode", gift.getGiftCode()
                )));

        return GiftSubscriptionResponse.from(gift);
    }

    public List<GiftSubscriptionResponse> myGifts(String purchaserEmail) {
        User purchaser = userService.findByEmail(purchaserEmail);
        return giftSubscriptionRepository.findByPurchaserOrderByPurchasedAtDesc(purchaser).stream()
                .map(GiftSubscriptionResponse::from)
                .toList();
    }

    /** Redeeming while already signed in — an unknown or already-used code is a real error, not silently ignored. */
    @Transactional
    public SubscriptionResponse redeem(String rawCode, String redeemerEmail) {
        GiftSubscription gift = giftSubscriptionRepository.findByGiftCode(normalize(rawCode))
                .orElseThrow(() -> new BusinessException("Unknown gift code"));
        if (gift.getStatus() == GiftStatus.REDEEMED) {
            throw new BusinessException("This gift has already been redeemed");
        }
        User redeemer = userService.findByEmail(redeemerEmail);
        return applyRedemption(gift, redeemer);
    }

    /**
     * Redeeming as part of registration — an unknown, malformed, or
     * already-redeemed code is silently ignored (registration must still
     * succeed) rather than surfaced as an error, mirroring how an unknown
     * referral code is handled. Returns the redeemed gift (so the caller can
     * read its plan) rather than a {@link SubscriptionResponse}, since
     * registration returns an {@code AuthResponse}, not a subscription one.
     */
    @Transactional
    public Optional<GiftSubscription> redeemAtRegistration(User newUser, String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return Optional.empty();
        }
        return giftSubscriptionRepository.findByGiftCode(normalize(rawCode))
                .filter(g -> g.getStatus() == GiftStatus.PENDING)
                .map(gift -> {
                    applyRedemption(gift, newUser);
                    return gift;
                });
    }

    private SubscriptionResponse applyRedemption(GiftSubscription gift, User redeemer) {
        gift.setStatus(GiftStatus.REDEEMED);
        gift.setRedeemedBy(redeemer);
        gift.setRedeemedAt(LocalDateTime.now());
        giftSubscriptionRepository.save(gift);

        var subscription = subscriptionService.activateGiftedPlan(redeemer, gift.getPlan(), gift.getBillingCycle());

        events.publish(Topics.USER_EVENTS, "gift.redeemed", gift.getPurchaser().getId().toString(), Map.of(
                "userId", gift.getPurchaser().getId().toString(),
                "userEmail", gift.getPurchaser().getEmail(),
                "redeemedByName", redeemer.getFirstName() + " " + redeemer.getLastName(),
                "plan", gift.getPlan().name()
        ));

        return subscription;
    }

    private String normalize(String rawCode) {
        return rawCode.trim().toUpperCase();
    }

    private String generateUniqueGiftCode() {
        for (int attempt = 0; attempt < GIFT_CODE_MAX_ATTEMPTS; attempt++) {
            String candidate = UUID.randomUUID().toString().replace("-", "")
                    .substring(0, GIFT_CODE_LENGTH).toUpperCase();
            if (!giftSubscriptionRepository.existsByGiftCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique gift code after "
                + GIFT_CODE_MAX_ATTEMPTS + " attempts");
    }
}
