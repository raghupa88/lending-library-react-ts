package com.lendinglibrary.api.dto;

public record UpdateUserRequest(
        String firstName,
        String lastName,
        String phone,
        String address
) {}
