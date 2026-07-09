package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank String firstName,
        @NotBlank String lastName,
        String phone,
        String address,
        /** An unknown or malformed code is ignored rather than rejected — a typo shouldn't block signup. */
        String referralCode,
        /** An unknown, malformed, or already-redeemed gift code is ignored the same way. */
        String giftCode,
        /** An unknown, malformed, or full organization code is ignored the same way. */
        String orgCode
) {}
