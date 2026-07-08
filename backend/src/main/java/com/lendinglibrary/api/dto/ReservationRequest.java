package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReservationRequest(@NotNull UUID bookId) {}
