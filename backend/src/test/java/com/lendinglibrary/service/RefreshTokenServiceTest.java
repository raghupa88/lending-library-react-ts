package com.lendinglibrary.service;

import com.lendinglibrary.application.service.RefreshTokenService;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.exception.UnauthorizedException;
import com.lendinglibrary.infrastructure.persistence.RefreshTokenRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Rotation + reuse-detection against the real repository, running on the
 * Flyway-migrated H2 schema (V3__refresh_tokens.sql).
 */
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class RefreshTokenServiceTest {

    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired UserRepository userRepository;

    private RefreshTokenService service;
    private User user;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        service = new RefreshTokenService(refreshTokenRepository);
        ReflectionTestUtils.setField(service, "refreshExpirationMs", 604_800_000L);
        user = userRepository.findByEmail("member@example.com").orElseThrow();
    }

    @Test
    void rotate_consumesOldTokenAndIssuesSuccessorInSameFamily() {
        var first = service.issueFamily(user);
        var second = service.rotate(first.rawToken());

        assertThat(second.rawToken()).isNotEqualTo(first.rawToken());
        assertThat(second.record().getFamilyId()).isEqualTo(first.record().getFamilyId());
        // The consumed token is now revoked
        assertThat(refreshTokenRepository.findByTokenHash(
                RefreshTokenService.hash(first.rawToken())).orElseThrow().isRevoked()).isTrue();
    }

    @Test
    void reuseOfRotatedToken_revokesWholeFamily() {
        var first = service.issueFamily(user);
        var second = service.rotate(first.rawToken());

        // Replaying the already-rotated token = theft signal
        assertThatThrownBy(() -> service.rotate(first.rawToken()))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("reuse detected");

        // The successor is dead too — the whole family is revoked
        assertThatThrownBy(() -> service.rotate(second.rawToken()))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void unknownToken_isRejected() {
        assertThatThrownBy(() -> service.rotate("never-issued"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid refresh token");
    }

    @Test
    void revoke_killsTheFamily() {
        var issued = service.issueFamily(user);
        service.revoke(issued.rawToken());

        assertThatThrownBy(() -> service.rotate(issued.rawToken()))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void distinctLogins_getIndependentFamilies() {
        var laptop = service.issueFamily(user);
        var phone = service.issueFamily(user);

        // Revoking one session leaves the other intact
        service.revoke(laptop.rawToken());
        var rotated = service.rotate(phone.rawToken());

        assertThat(rotated.record().getFamilyId()).isEqualTo(phone.record().getFamilyId());
    }
}
