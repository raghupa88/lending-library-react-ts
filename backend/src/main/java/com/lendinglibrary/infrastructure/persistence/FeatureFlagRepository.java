package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, UUID> {
    Optional<FeatureFlag> findByKey(String key);
    boolean existsByKey(String key);
    List<FeatureFlag> findByEnabledTrue();
}
