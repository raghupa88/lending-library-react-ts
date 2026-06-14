package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record BookRequest(
        @NotBlank String title,
        @NotBlank String author,
        @NotBlank String isbn,
        String description,
        @Min(1) int totalCopies,
        @NotNull @DecimalMin("0.00") BigDecimal purchasePrice,
        String category,
        String language,
        Integer pageCount,
        Double rating,
        String coverUrl,
        Integer publishedYear
) {}
