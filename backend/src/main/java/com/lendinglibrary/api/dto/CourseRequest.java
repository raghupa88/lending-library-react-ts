package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseTrack;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CourseRequest(
        @NotBlank String slug,
        @NotBlank String title,
        @NotNull CourseTrack track,
        @NotNull CourseLevel level,
        @NotBlank String language,
        String summary,
        @NotNull @DecimalMin("0.00") BigDecimal price
) {}
