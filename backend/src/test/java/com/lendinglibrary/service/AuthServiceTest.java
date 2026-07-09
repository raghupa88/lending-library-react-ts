package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.LoginRequest;
import com.lendinglibrary.api.dto.RegisterRequest;
import com.lendinglibrary.application.service.AuthService;
import com.lendinglibrary.application.service.GiftService;
import com.lendinglibrary.application.service.OrganizationService;
import com.lendinglibrary.application.service.RefreshTokenService;
import com.lendinglibrary.domain.entity.GiftSubscription;
import com.lendinglibrary.domain.entity.Organization;
import com.lendinglibrary.domain.entity.RefreshToken;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock JwtProvider jwtProvider;
    @Mock PasswordEncoder passwordEncoder;
    @Mock RefreshTokenService refreshTokenService;
    @Mock DomainEventPublisher events;
    @Mock GiftService giftService;
    @Mock OrganizationService organizationService;
    @InjectMocks AuthService authService;

    private User testUser;
    private Subscription testSubscription;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID()).email("test@example.com")
                .passwordHash("$2a$hash").firstName("Test").lastName("User")
                .role(Role.MEMBER).active(true).build();

        testSubscription = Subscription.builder()
                .id(UUID.randomUUID()).user(testUser).plan(SubscriptionPlan.BASIC)
                .monthlyPrice(new BigDecimal("199.00")).startDate(LocalDateTime.now())
                .status(SubscriptionStatus.ACTIVE).maxConcurrentLoans(3).build();
    }

    @Test
    void register_success() {
        var req = new RegisterRequest("new@example.com", "password123", "New", "User", null, null, null, null, null);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any())).thenReturn(testUser);
        when(subscriptionRepository.save(any())).thenReturn(testSubscription);
        when(jwtProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(refreshTokenService.issueFamily(any()))
                .thenReturn(new RefreshTokenService.IssuedToken("refresh-token",
                        RefreshToken.builder().user(testUser).build()));

        var result = authService.register(req);

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        verify(subscriptionRepository).save(any(Subscription.class));
    }

    @Test
    void register_withValidReferralCode_creditsReferrerAndLinksUser() {
        User referrer = User.builder()
                .id(UUID.randomUUID()).email("referrer@example.com")
                .referralCode("REFCODE1").referralCreditBalance(BigDecimal.ZERO)
                .firstName("Ref").lastName("Errer").role(Role.MEMBER).active(true).build();
        var req = new RegisterRequest("new@example.com", "password123", "New", "User", null, null, "refcode1", null, null);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.findByReferralCode("REFCODE1")).thenReturn(Optional.of(referrer));
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(subscriptionRepository.save(any())).thenReturn(testSubscription);
        when(jwtProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(refreshTokenService.issueFamily(any()))
                .thenReturn(new RefreshTokenService.IssuedToken("refresh-token",
                        RefreshToken.builder().user(testUser).build()));

        authService.register(req);

        assertThat(referrer.getReferralCreditBalance()).isEqualByComparingTo("100.00");
        verify(events).publish(eq(Topics.USER_EVENTS), eq("referral.credited"), eq(referrer.getId().toString()), any());
    }

    @Test
    void register_withUnknownReferralCode_stillSucceeds_noCreditGranted() {
        var req = new RegisterRequest("new@example.com", "password123", "New", "User", null, null, "BADCODE1", null, null);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.findByReferralCode("BADCODE1")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any())).thenReturn(testUser);
        when(subscriptionRepository.save(any())).thenReturn(testSubscription);
        when(jwtProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(refreshTokenService.issueFamily(any()))
                .thenReturn(new RefreshTokenService.IssuedToken("refresh-token",
                        RefreshToken.builder().user(testUser).build()));

        var result = authService.register(req);

        assertThat(result.accessToken()).isEqualTo("access-token");
        verify(events, never()).publish(eq(Topics.USER_EVENTS), any(), any(), any());
    }

    @Test
    void register_withValidGiftCode_activatesGiftedPlanInsteadOfBasic() {
        var req = new RegisterRequest("new@example.com", "password123", "New", "User", null, null, null, "giftcode1", null);
        GiftSubscription gift = GiftSubscription.builder().plan(SubscriptionPlan.PREMIUM).build();
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any())).thenReturn(testUser);
        when(giftService.redeemAtRegistration(any(), eq("giftcode1"))).thenReturn(Optional.of(gift));
        when(jwtProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(refreshTokenService.issueFamily(any()))
                .thenReturn(new RefreshTokenService.IssuedToken("refresh-token",
                        RefreshToken.builder().user(testUser).build()));

        var result = authService.register(req);

        assertThat(result.plan()).isEqualTo("premium");
        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void register_withValidOrgCode_activatesOrgPlanInsteadOfBasic() {
        var req = new RegisterRequest("new@example.com", "password123", "New", "User", null, null, null, null, "orgcode1");
        Organization org = Organization.builder().plan(SubscriptionPlan.PREMIUM).build();
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any())).thenReturn(testUser);
        when(organizationService.joinAtRegistration(any(), eq("orgcode1"))).thenReturn(Optional.of(org));
        when(jwtProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(refreshTokenService.issueFamily(any()))
                .thenReturn(new RefreshTokenService.IssuedToken("refresh-token",
                        RefreshToken.builder().user(testUser).build()));

        var result = authService.register(req);

        assertThat(result.plan()).isEqualTo("premium");
        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void register_duplicateEmail_throws() {
        var req = new RegisterRequest("test@example.com", "password123", "A", "B", null, null, null, null, null);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Email already in use");
    }

    @Test
    void login_success() {
        var req = new LoginRequest("test@example.com", "password123");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", testUser.getPasswordHash())).thenReturn(true);
        when(subscriptionRepository.findByUserAndStatus(testUser, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(testSubscription));
        when(jwtProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(refreshTokenService.issueFamily(any()))
                .thenReturn(new RefreshTokenService.IssuedToken("refresh-token",
                        RefreshToken.builder().user(testUser).build()));

        var result = authService.login(req);

        assertThat(result.email()).isEqualTo("test@example.com");
        assertThat(result.plan()).isEqualTo("basic");
    }

    @Test
    void login_wrongPassword_throws() {
        var req = new LoginRequest("test@example.com", "wrongpassword");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpassword", testUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void login_userNotFound_throws() {
        var req = new LoginRequest("missing@example.com", "password123");
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class);
    }
}
