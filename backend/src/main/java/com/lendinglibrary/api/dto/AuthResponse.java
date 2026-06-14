package com.lendinglibrary.api.dto;

import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        String name,
        String role,
        String plan,
        String accessToken,
        String refreshToken
) {}
