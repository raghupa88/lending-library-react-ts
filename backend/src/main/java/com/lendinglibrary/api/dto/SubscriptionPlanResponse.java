package com.lendinglibrary.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record SubscriptionPlanResponse(
        String id,
        String name,
        BigDecimal price,
        BigDecimal annualPrice,
        int maxBooks,
        List<String> features,
        boolean popular
) {}
