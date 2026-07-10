package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.FeatureFlag;

import java.time.LocalDateTime;
import java.util.UUID;

public record FeatureFlagResponse(
        UUID id,
        String key,
        String name,
        String description,
        boolean enabled,
        LocalDateTime updatedAt
) {
    public static FeatureFlagResponse from(FeatureFlag flag) {
        return new FeatureFlagResponse(
                flag.getId(), flag.getKey(), flag.getName(), flag.getDescription(),
                flag.isEnabled(), flag.getUpdatedAt());
    }
}
