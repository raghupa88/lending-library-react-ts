package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.SubscriptionPlanResponse;
import com.lendinglibrary.api.dto.SubscriptionRequest;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserService userService;

    public List<SubscriptionPlanResponse> getPlans() {
        return List.of(
            new SubscriptionPlanResponse("basic", "Basic", new BigDecimal("199.00"), 3,
                List.of("Up to 3 books at a time", "Home delivery", "15-day loan period"), false),
            new SubscriptionPlanResponse("premium", "Premium", new BigDecimal("399.00"),
                Integer.MAX_VALUE,
                List.of("Unlimited books", "Priority home delivery", "30-day loan period",
                        "Early access to new titles"), true)
        );
    }

    public SubscriptionResponse getCurrent(String email) {
        var user = userService.findByEmail(email);
        return subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                .map(SubscriptionResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("No active subscription found"));
    }

    @Transactional
    public SubscriptionResponse subscribe(SubscriptionRequest req, String email) {
        var user = userService.findByEmail(email);

        // Cancel any existing active subscription
        subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                .ifPresent(s -> {
                    s.setStatus(SubscriptionStatus.CANCELLED);
                    s.setEndDate(LocalDateTime.now());
                    subscriptionRepository.save(s);
                });

        BigDecimal price = switch (req.plan()) {
            case BASIC -> new BigDecimal("199.00");
            case PREMIUM -> new BigDecimal("399.00");
            case ADMIN -> BigDecimal.ZERO;
        };

        Subscription sub = Subscription.builder()
                .user(user).plan(req.plan()).monthlyPrice(price)
                .startDate(LocalDateTime.now()).status(SubscriptionStatus.ACTIVE)
                .maxConcurrentLoans(req.plan().maxConcurrentLoans())
                .build();

        return SubscriptionResponse.from(subscriptionRepository.save(sub));
    }
}
