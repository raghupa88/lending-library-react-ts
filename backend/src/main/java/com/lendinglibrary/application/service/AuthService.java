package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.UnauthorizedException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import com.lendinglibrary.infrastructure.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final BigDecimal REFERRAL_CREDIT_AMOUNT = new BigDecimal("100.00");
    private static final int REFERRAL_CODE_LENGTH = 8;
    private static final int REFERRAL_CODE_MAX_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final JwtProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final DomainEventPublisher events;
    private final GiftService giftService;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException("Email already in use: " + req.email());
        }

        // An unknown or malformed code is silently ignored — a typo in a
        // shared referral link shouldn't block someone from signing up.
        User referrer = req.referralCode() == null || req.referralCode().isBlank()
                ? null
                : userRepository.findByReferralCode(req.referralCode().trim().toUpperCase()).orElse(null);

        User user = User.builder()
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .firstName(req.firstName())
                .lastName(req.lastName())
                .role(Role.MEMBER)
                .phone(req.phone())
                .address(req.address())
                .referralCode(generateUniqueReferralCode())
                .referredBy(referrer)
                .build();
        user = userRepository.save(user);

        if (referrer != null) {
            referrer.setReferralCreditBalance(referrer.getReferralCreditBalance().add(REFERRAL_CREDIT_AMOUNT));
            userRepository.save(referrer);
            events.publish(Topics.USER_EVENTS, "referral.credited", referrer.getId().toString(), Map.of(
                    "userId", referrer.getId().toString(),
                    "userEmail", referrer.getEmail(),
                    "referredName", user.getFirstName() + " " + user.getLastName(),
                    "creditAmount", REFERRAL_CREDIT_AMOUNT.toString()
            ));
        }

        // A valid, unredeemed gift code activates the gifted plan instead of
        // the usual auto-assigned BASIC; an unknown/already-used code is
        // silently ignored, same as an unknown referral code above.
        var redeemedGift = giftService.redeemAtRegistration(user, req.giftCode());
        if (redeemedGift.isPresent()) {
            return buildAuthResponse(user, redeemedGift.get().getPlan());
        }

        // Auto-assign BASIC subscription on registration
        Subscription sub = Subscription.builder()
                .user(user)
                .plan(SubscriptionPlan.BASIC)
                .monthlyPrice(new BigDecimal("199.00"))
                .startDate(LocalDateTime.now())
                .status(SubscriptionStatus.ACTIVE)
                .maxConcurrentLoans(SubscriptionPlan.BASIC.maxConcurrentLoans())
                .build();
        subscriptionRepository.save(sub);

        return buildAuthResponse(user, sub.getPlan());
    }

    private String generateUniqueReferralCode() {
        for (int attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt++) {
            String candidate = UUID.randomUUID().toString().replace("-", "")
                    .substring(0, REFERRAL_CODE_LENGTH).toUpperCase();
            if (!userRepository.existsByReferralCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique referral code after "
                + REFERRAL_CODE_MAX_ATTEMPTS + " attempts");
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        SubscriptionPlan plan = subscriptionRepository
                .findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                .map(Subscription::getPlan)
                .orElse(SubscriptionPlan.BASIC);

        return buildAuthResponse(user, plan);
    }

    /** Rotate the presented refresh token and mint a fresh access token. */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Missing refresh token");
        }
        RefreshTokenService.IssuedToken rotated = refreshTokenService.rotate(rawRefreshToken);
        User user = rotated.record().getUser();

        SubscriptionPlan plan = subscriptionRepository
                .findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                .map(Subscription::getPlan)
                .orElse(SubscriptionPlan.BASIC);

        return buildAuthResponse(user, plan, rotated.rawToken());
    }

    /** Server-side logout: revoke the presented token's whole family. */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revoke(rawRefreshToken);
        }
    }

    private AuthResponse buildAuthResponse(User user, SubscriptionPlan plan) {
        return buildAuthResponse(user, plan, refreshTokenService.issueFamily(user).rawToken());
    }

    private AuthResponse buildAuthResponse(User user, SubscriptionPlan plan, String refreshToken) {
        String access = jwtProvider.generateAccessToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                user.getRole().name().toLowerCase(),
                plan.name().toLowerCase(),
                access,
                refreshToken
        );
    }
}
