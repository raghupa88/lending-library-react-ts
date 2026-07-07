package com.lendinglibrary.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record BatchRequest(
        @NotNull UUID venueId,
        @NotBlank String instructorName,
        @NotNull LocalDate startsOn,
        @NotNull LocalDate endsOn,
        @NotBlank String scheduleText,
        @Min(1) int capacity,
        @NotNull @DecimalMin("0.00") BigDecimal fee,
        @NotEmpty @Valid List<SessionInput> sessions
) {}
