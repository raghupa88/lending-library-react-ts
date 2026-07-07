package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record VenueRequest(
        @NotBlank String name,
        String address,
        @NotBlank String city,
        @Min(1) int capacityDefault
) {}
