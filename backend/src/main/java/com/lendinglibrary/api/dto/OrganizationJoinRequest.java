package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.NotBlank;

public record OrganizationJoinRequest(@NotBlank String joinCode) {
}
