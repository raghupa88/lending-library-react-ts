package com.lendinglibrary.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String name,
        String email,
        String role,
        boolean active,
        String plan,
        long activeLoans,
        LocalDateTime joinedAt
) {}
