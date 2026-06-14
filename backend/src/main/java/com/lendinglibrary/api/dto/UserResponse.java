package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String name,
        String role,
        String phone,
        String address
) {
    public static UserResponse from(User u) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getFirstName() + " " + u.getLastName(),
                u.getRole().name().toLowerCase(),
                u.getPhone(),
                u.getAddress()
        );
    }
}
