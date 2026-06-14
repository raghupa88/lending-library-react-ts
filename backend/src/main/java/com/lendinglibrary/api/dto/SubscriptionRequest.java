package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.enums.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record SubscriptionRequest(@NotNull SubscriptionPlan plan) {}
