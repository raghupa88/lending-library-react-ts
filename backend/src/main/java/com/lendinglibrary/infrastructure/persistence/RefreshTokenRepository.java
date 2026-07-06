package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * REQUIRES_NEW: reuse detection revokes the family and then throws —
     * this update must commit independently instead of rolling back with
     * the caller's transaction.
     */
    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query("update RefreshToken t set t.revoked = true where t.familyId = :familyId")
    void revokeFamily(UUID familyId);
}
