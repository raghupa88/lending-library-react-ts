package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Organization;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrganizationResponse(
        UUID id,
        String name,
        String plan,
        String billingCycle,
        int seatsTotal,
        int seatsUsed,
        String joinCode,
        BigDecimal amountPaid,
        LocalDateTime createdAt,
        List<OrganizationMemberResponse> members
) {
    public static OrganizationResponse from(Organization org, List<OrganizationMemberResponse> members) {
        return new OrganizationResponse(
                org.getId(),
                org.getName(),
                org.getPlan().name().toLowerCase(),
                org.getBillingCycle().name().toLowerCase(),
                org.getSeatsTotal(),
                org.getSeatsUsed(),
                org.getJoinCode(),
                org.getAmountPaid(),
                org.getCreatedAt(),
                members
        );
    }
}
