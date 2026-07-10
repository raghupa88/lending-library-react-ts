package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record FeatureFlagRequest(
        @NotBlank
        @Pattern(regexp = "[a-z][a-z0-9_]*", message = "Key must be lowercase snake_case, e.g. b2b_tier")
        String key,
        @NotBlank String name,
        String description,
        Boolean enabled
) {
    /** New flags default to off unless the admin explicitly turns them on at creation. */
    public FeatureFlagRequest {
        if (enabled == null) {
            enabled = false;
        }
    }
}
