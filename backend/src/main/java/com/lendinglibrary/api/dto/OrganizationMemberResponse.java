package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.OrganizationMember;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrganizationMemberResponse(
        UUID userId,
        String name,
        String email,
        LocalDateTime joinedAt
) {
    public static OrganizationMemberResponse from(OrganizationMember m) {
        var user = m.getUser();
        return new OrganizationMemberResponse(
                user.getId(),
                user.getFirstName() + " " + user.getLastName(),
                user.getEmail(),
                m.getJoinedAt()
        );
    }
}
