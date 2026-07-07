package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TestRequest(
        @NotBlank String title,
        @Min(1) int passPercent,
        @Min(1) int timeLimitMin,
        @Min(1) int attemptsAllowed
) {}
