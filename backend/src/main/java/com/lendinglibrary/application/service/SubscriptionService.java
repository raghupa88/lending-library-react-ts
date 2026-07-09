package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.SubscriptionPlanResponse;
import com.lendinglibrary.api.dto.SubscriptionRequest;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private static final int PAUSE_MONTHS = 1;
    private static final List<SubscriptionStatus> NON_TERMINAL =
            List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED);

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final DomainEventPublisher events;

    public List<SubscriptionPlanResponse> getPlans() {
        BigDecimal basicPrice = new BigDecimal("199.00");
        BigDecimal premiumPrice = new BigDecimal("399.00");
        return List.of(
            new SubscriptionPlanResponse("basic", "Basic", basicPrice,
                BillingCycle.ANNUAL.totalBilled(basicPrice), 3,
                List.of("Up to 3 books at a time", "Home delivery", "15-day loan period"), false),
            new SubscriptionPlanResponse("premium", "Premium", premiumPrice,
                BillingCycle.ANNUAL.totalBilled(premiumPrice), Integer.MAX_VALUE,
                List.of("Unlimited books", "Priority home delivery", "30-day loan period",
                        "Early access to new titles"), true)
        );
    }

    /** "Current" means the one non-terminal subscription (active or paused) — cancelled/expired ones aren't. */
    public SubscriptionResponse getCurrent(String email) {
        var user = userService.findByEmail(email);
        return subscriptionRepository.findByUserAndStatusIn(user, NON_TERMINAL)
                .map(SubscriptionResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("No active subscription found"));
    }

    @Transactional
    public SubscriptionResponse subscribe(SubscriptionRequest req, String email) {
        var user = userService.findByEmail(email);
        Subscription sub = replaceActiveSubscription(user, req.plan(), req.billingCycle());

        // Referral credit is spent automatically, capped at this bill's total;
        // any leftover balance carries over to the next subscribe.
        BigDecimal fullTotal = sub.getBillingCycle().totalBilled(sub.getMonthlyPrice());
        BigDecimal creditApplied = user.getReferralCreditBalance().min(fullTotal);
        if (creditApplied.compareTo(BigDecimal.ZERO) > 0) {
            user.setReferralCreditBalance(user.getReferralCreditBalance().subtract(creditApplied));
            userRepository.save(user);
        }

        events.publish(Topics.SUBSCRIPTION_EVENTS, "subscription.changed", sub.getId().toString(), Map.of(
                "userId", user.getId().toString(),
                "userEmail", user.getEmail(),
                "plan", sub.getPlan().name(),
                "monthlyPrice", sub.getMonthlyPrice().toString(),
                "billingCycle", sub.getBillingCycle().name(),
                "totalBilled", fullTotal.subtract(creditApplied).toString()
        ));

        return SubscriptionResponse.from(sub, creditApplied);
    }

    /**
     * Activates a plan a gift subscription already paid for — same
     * cancel-existing-and-create logic as {@link #subscribe}, but never
     * spends the user's own referral credit (the gift already covered it).
     */
    @Transactional
    public SubscriptionResponse activateGiftedPlan(User user, SubscriptionPlan plan, BillingCycle billingCycle) {
        Subscription sub = replaceActiveSubscription(user, plan, billingCycle);

        events.publish(Topics.SUBSCRIPTION_EVENTS, "subscription.changed", sub.getId().toString(), Map.of(
                "userId", user.getId().toString(),
                "userEmail", user.getEmail(),
                "plan", sub.getPlan().name(),
                "monthlyPrice", sub.getMonthlyPrice().toString(),
                "billingCycle", sub.getBillingCycle().name(),
                "totalBilled", sub.getBillingCycle().totalBilled(sub.getMonthlyPrice()).toString()
        ));

        return SubscriptionResponse.from(sub);
    }

    /**
     * Cancels a member's active subscription with no replacement — used when
     * an organization owner removes a member from their B2B plan. The member
     * would need to personally subscribe again if they want to keep borrowing.
     */
    @Transactional
    public void cancelActiveSubscription(User user) {
        subscriptionRepository.findByUserAndStatusIn(user, NON_TERMINAL)
                .ifPresent(s -> {
                    s.setStatus(SubscriptionStatus.CANCELLED);
                    s.setEndDate(LocalDateTime.now());
                    subscriptionRepository.save(s);
                });
    }

    /** Single source of truth for plan sticker prices — also used to price a gift purchase. */
    public BigDecimal priceFor(SubscriptionPlan plan) {
        return switch (plan) {
            case BASIC -> new BigDecimal("199.00");
            case PREMIUM -> new BigDecimal("399.00");
            case ADMIN -> BigDecimal.ZERO;
        };
    }

    /** Cancels any existing non-terminal subscription (active or paused) and starts a fresh one. */
    private Subscription replaceActiveSubscription(User user, SubscriptionPlan plan, BillingCycle billingCycle) {
        subscriptionRepository.findByUserAndStatusIn(user, NON_TERMINAL)
                .ifPresent(s -> {
                    s.setStatus(SubscriptionStatus.CANCELLED);
                    s.setEndDate(LocalDateTime.now());
                    subscriptionRepository.save(s);
                });

        Subscription sub = Subscription.builder()
                .user(user).plan(plan).monthlyPrice(priceFor(plan)).billingCycle(billingCycle)
                .startDate(LocalDateTime.now()).status(SubscriptionStatus.ACTIVE)
                .maxConcurrentLoans(plan.maxConcurrentLoans())
                .build();
        return subscriptionRepository.save(sub);
    }

    /**
     * Pausing suspends the plan's perks (loan limit falls back to the same
     * default an unsubscribed member gets) without cancelling it outright —
     * it resumes on its own after a month, or earlier via {@link #resume}.
     */
    @Transactional
    public SubscriptionResponse pause(String email) {
        var user = userService.findByEmail(email);
        Subscription sub = subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active subscription to pause"));

        sub.setStatus(SubscriptionStatus.PAUSED);
        sub.setPausedUntil(LocalDateTime.now().plusMonths(PAUSE_MONTHS));
        sub = subscriptionRepository.save(sub);

        publishStatusEvent(sub, "subscription.paused");
        return SubscriptionResponse.from(sub);
    }

    @Transactional
    public SubscriptionResponse resume(String email) {
        var user = userService.findByEmail(email);
        Subscription sub = subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.PAUSED)
                .orElseThrow(() -> new BusinessException("This subscription isn't paused"));

        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setPausedUntil(null);
        sub = subscriptionRepository.save(sub);

        publishStatusEvent(sub, "subscription.resumed");
        return SubscriptionResponse.from(sub);
    }

    @Scheduled(fixedDelayString = "${subscriptions.pause-sweep-interval-ms:3600000}")
    @Transactional
    public void resumeExpiredPauses() {
        List<Subscription> due = subscriptionRepository
                .findByStatusAndPausedUntilBefore(SubscriptionStatus.PAUSED, LocalDateTime.now());
        for (Subscription sub : due) {
            sub.setStatus(SubscriptionStatus.ACTIVE);
            sub.setPausedUntil(null);
            subscriptionRepository.save(sub);
            publishStatusEvent(sub, "subscription.resumed");
        }
    }

    private void publishStatusEvent(Subscription sub, String eventType) {
        events.publish(Topics.SUBSCRIPTION_EVENTS, eventType, sub.getId().toString(), Map.of(
                "userId", sub.getUser().getId().toString(),
                "userEmail", sub.getUser().getEmail(),
                "plan", sub.getPlan().name()
        ));
    }
}
