package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.OrganizationMemberResponse;
import com.lendinglibrary.api.dto.OrganizationPurchaseRequest;
import com.lendinglibrary.api.dto.OrganizationResponse;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.domain.entity.Organization;
import com.lendinglibrary.domain.entity.OrganizationMember;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.OrganizationMemberRepository;
import com.lendinglibrary.infrastructure.persistence.OrganizationRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * B2B tier: an owner buys N seats of a plan for their school/company,
 * paying for the whole block now via the fake payment provider (a real
 * purchase, same as {@link GiftService#purchase} — see ADR-024). Members
 * redeem the org's shareable join code — at registration if they're new,
 * or via {@link #join} if they're already a member — to get that plan.
 */
@Service
@RequiredArgsConstructor
public class OrganizationService {

    private static final int JOIN_CODE_LENGTH = 8;
    private static final int JOIN_CODE_MAX_ATTEMPTS = 5;

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final SubscriptionService subscriptionService;
    private final PaymentService paymentService;
    private final FeatureFlagService featureFlagService;

    @Transactional
    public OrganizationResponse purchase(OrganizationPurchaseRequest req, String ownerEmail) {
        requireB2bTierEnabled();
        User owner = userService.findByEmail(ownerEmail);
        if (organizationRepository.existsByOwner(owner)) {
            throw new BusinessException("You already have a business account");
        }

        BigDecimal seatPrice = req.billingCycle().totalBilled(subscriptionService.priceFor(req.plan()));
        BigDecimal amount = seatPrice.multiply(BigDecimal.valueOf(req.seatCount()));

        Organization org = organizationRepository.save(Organization.builder()
                .name(req.name())
                .owner(owner)
                .plan(req.plan())
                .billingCycle(req.billingCycle())
                .seatsTotal(req.seatCount())
                .joinCode(generateUniqueJoinCode())
                .amountPaid(amount)
                .createdAt(LocalDateTime.now())
                .build());

        Payment payment = paymentService.charge(
                owner, PaymentPurpose.ORGANIZATION_SEATS, org.getId(), amount, req.payment());
        if (payment.getStatus() != PaymentStatus.SUCCEEDED) {
            throw new BusinessException(payment.getFailureReason());
        }

        return OrganizationResponse.from(org, List.of());
    }

    public OrganizationResponse mine(String ownerEmail) {
        User owner = userService.findByEmail(ownerEmail);
        Organization org = organizationRepository.findByOwner(owner)
                .orElseThrow(() -> new ResourceNotFoundException("You don't have a business account yet"));
        var members = organizationMemberRepository.findByOrganizationOrderByJoinedAt(org).stream()
                .map(OrganizationMemberResponse::from)
                .toList();
        return OrganizationResponse.from(org, members);
    }

    /** Joining while already signed in — an unknown/full code is a real error, not silently ignored. */
    @Transactional
    public SubscriptionResponse join(String rawCode, String memberEmail) {
        requireB2bTierEnabled();
        User member = userService.findByEmail(memberEmail);
        if (organizationMemberRepository.existsByUser(member)) {
            throw new BusinessException("You're already part of an organization");
        }
        Organization org = organizationRepository.findByJoinCode(normalize(rawCode))
                .orElseThrow(() -> new BusinessException("Unknown organization code"));
        if (org.getSeatsUsed() >= org.getSeatsTotal()) {
            throw new BusinessException("This organization has no seats left");
        }
        return addMember(org, member);
    }

    /**
     * Joining as part of registration — an unknown, full, or already-a-member
     * code is silently ignored (registration must still succeed), mirroring
     * how an unknown referral/gift code is handled. A disabled b2b_tier flag
     * gets the same silent-skip treatment, not an error, for the same reason.
     */
    @Transactional
    public Optional<Organization> joinAtRegistration(User newUser, String rawCode) {
        if (rawCode == null || rawCode.isBlank() || !featureFlagService.isEnabled(FeatureFlagKeys.B2B_TIER)) {
            return Optional.empty();
        }
        return organizationRepository.findByJoinCode(normalize(rawCode))
                .filter(org -> org.getSeatsUsed() < org.getSeatsTotal())
                .map(org -> {
                    addMember(org, newUser);
                    return org;
                });
    }

    /** The org's owner removes a member: their org-granted subscription ends and their seat frees up. */
    @Transactional
    public void removeMember(String ownerEmail, UUID memberUserId) {
        User owner = userService.findByEmail(ownerEmail);
        Organization org = organizationRepository.findByOwner(owner)
                .orElseThrow(() -> new ResourceNotFoundException("You don't have a business account yet"));

        User member = userRepository.findById(memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + memberUserId));
        OrganizationMember membership = organizationMemberRepository.findByOrganizationAndUser(org, member)
                .orElseThrow(() -> new BusinessException("That person isn't a member of your organization"));

        organizationMemberRepository.delete(membership);
        org.setSeatsUsed(org.getSeatsUsed() - 1);
        organizationRepository.save(org);
        subscriptionService.cancelActiveSubscription(member);
    }

    private SubscriptionResponse addMember(Organization org, User member) {
        organizationMemberRepository.save(OrganizationMember.builder()
                .organization(org).user(member).joinedAt(LocalDateTime.now()).build());
        org.setSeatsUsed(org.getSeatsUsed() + 1);
        organizationRepository.save(org);
        return subscriptionService.activateGiftedPlan(member, org.getPlan(), org.getBillingCycle());
    }

    /** Purchasing and logged-in joins are hard errors when disabled — unlike
     * {@link #joinAtRegistration}, both are explicit, deliberate actions
     * where failing silently would hide a real problem from the one person
     * who needs to know (same asymmetry as ADR-022's gift-code handling). */
    private void requireB2bTierEnabled() {
        if (!featureFlagService.isEnabled(FeatureFlagKeys.B2B_TIER)) {
            throw new BusinessException("Business accounts are not available right now");
        }
    }

    private String normalize(String rawCode) {
        return rawCode.trim().toUpperCase();
    }

    private String generateUniqueJoinCode() {
        for (int attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
            String candidate = UUID.randomUUID().toString().replace("-", "")
                    .substring(0, JOIN_CODE_LENGTH).toUpperCase();
            if (!organizationRepository.existsByJoinCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique join code after "
                + JOIN_CODE_MAX_ATTEMPTS + " attempts");
    }
}
