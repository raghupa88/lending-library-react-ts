package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.NotNull;

public record SetFeatureFlagEnabledRequest(@NotNull Boolean enabled) {
}
