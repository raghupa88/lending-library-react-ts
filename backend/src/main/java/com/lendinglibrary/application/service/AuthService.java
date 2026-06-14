package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.UnauthorizedException;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import com.lendinglibrary.infrastructure.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final JwtProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException("Email already in use: " + req.email());
        }

        User user = User.builder()
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .firstName(req.firstName())
                .lastName(req.lastName())
                .role(Role.MEMBER)
                .phone(req.phone())
                .address(req.address())
                .build();
        user = userRepository.save(user);

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

    public AuthResponse refresh(RefreshRequest req) {
        if (!jwtProvider.isValid(req.refreshToken())) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        String email = jwtProvider.extractEmail(req.refreshToken());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        SubscriptionPlan plan = subscriptionRepository
                .findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                .map(Subscription::getPlan)
                .orElse(SubscriptionPlan.BASIC);

        return buildAuthResponse(user, plan);
    }

    private AuthResponse buildAuthResponse(User user, SubscriptionPlan plan) {
        String access = jwtProvider.generateAccessToken(user.getEmail(), user.getRole().name());
        String refresh = jwtProvider.generateRefreshToken(user.getEmail());
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                user.getRole().name().toLowerCase(),
                plan.name().toLowerCase(),
                access,
                refresh
        );
    }
}
