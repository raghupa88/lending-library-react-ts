package com.lendinglibrary.application.service;

import com.lendinglibrary.domain.entity.RefreshToken;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.exception.UnauthorizedException;
import com.lendinglibrary.infrastructure.persistence.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Opaque refresh tokens with rotation and reuse detection (OAuth BCP):
 * every refresh invalidates the presented token and issues a successor in
 * the same family; presenting a token that was already rotated is treated
 * as theft and revokes the entire family.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository repository;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    public record IssuedToken(String rawToken, RefreshToken record) {}

    /** Start a new token family (login/register). */
    @Transactional
    public IssuedToken issueFamily(User user) {
        return mint(user, UUID.randomUUID());
    }

    /** Rotate: consume the presented token and mint its successor. */
    @Transactional
    public IssuedToken rotate(String rawToken) {
        RefreshToken current = repository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (current.isRevoked()) {
            // Reuse of a rotated token = replay/theft: kill the whole family.
            repository.revokeFamily(current.getFamilyId());
            throw new UnauthorizedException("Refresh token reuse detected — session revoked");
        }
        if (current.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token expired");
        }

        current.setRevoked(true);
        repository.save(current);
        return mint(current.getUser(), current.getFamilyId());
    }

    /** Best-effort logout: revoke the presented token's whole family. */
    @Transactional
    public void revoke(String rawToken) {
        repository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> repository.revokeFamily(token.getFamilyId()));
    }

    private IssuedToken mint(User user, UUID familyId) {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken record = repository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(raw))
                .familyId(familyId)
                .expiresAt(LocalDateTime.now().plusNanos(refreshExpirationMs * 1_000_000))
                .build());
        return new IssuedToken(raw, record);
    }

    public static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
