package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LoanRequest(
        @NotNull UUID bookId,
        @Min(1) @Max(60) int daysToKeep
) {}
