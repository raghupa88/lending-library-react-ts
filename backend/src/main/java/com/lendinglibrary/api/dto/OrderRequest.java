package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record OrderRequest(
        @NotNull @DecimalMin("0.00") BigDecimal totalAmount,
        String notes
) {}
