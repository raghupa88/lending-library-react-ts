package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.FeatureFlagRequest;
import com.lendinglibrary.api.dto.FeatureFlagResponse;
import com.lendinglibrary.domain.entity.FeatureFlag;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.FeatureFlagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Global on/off switches — no per-user or per-plan targeting (see
 * ADR-028). {@link #isEnabled} is the check other services call to gate a
 * real feature (e.g. {@code OrganizationService}); an unrecognized key is
 * treated as disabled rather than throwing, since a typo'd or
 * not-yet-created key should fail closed, not silently let a feature
 * through — though in practice callers only ever check hardcoded key
 * constants, so this path shouldn't be reachable at all.
 */
@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private final FeatureFlagRepository featureFlagRepository;

    public List<FeatureFlagResponse> list() {
        return featureFlagRepository.findAll().stream().map(FeatureFlagResponse::from).toList();
    }

    public Set<String> listEnabledKeys() {
        return featureFlagRepository.findByEnabledTrue().stream()
                .map(FeatureFlag::getKey)
                .collect(java.util.stream.Collectors.toSet());
    }

    public boolean isEnabled(String key) {
        return featureFlagRepository.findByKey(key).map(FeatureFlag::isEnabled).orElse(false);
    }

    @Transactional
    public FeatureFlagResponse create(FeatureFlagRequest req) {
        if (featureFlagRepository.existsByKey(req.key())) {
            throw new BusinessException("A flag with key \"" + req.key() + "\" already exists");
        }
        FeatureFlag flag = featureFlagRepository.save(FeatureFlag.builder()
                .key(req.key())
                .name(req.name())
                .description(req.description())
                .enabled(req.enabled())
                .build());
        return FeatureFlagResponse.from(flag);
    }

    @Transactional
    public FeatureFlagResponse setEnabled(String key, boolean enabled) {
        FeatureFlag flag = featureFlagRepository.findByKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("No feature flag with key: " + key));
        flag.setEnabled(enabled);
        return FeatureFlagResponse.from(featureFlagRepository.save(flag));
    }
}
