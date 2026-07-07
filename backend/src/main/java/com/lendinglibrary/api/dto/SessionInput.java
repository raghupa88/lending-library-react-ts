package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SessionInput(@NotNull LocalDate sessionDate, @NotBlank String topic) {}
