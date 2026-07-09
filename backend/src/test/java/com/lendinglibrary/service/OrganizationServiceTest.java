package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.OrganizationPurchaseRequest;
import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.application.service.OrganizationService;
import com.lendinglibrary.application.service.PaymentService;
import com.lendinglibrary.application.service.SubscriptionService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.Organization;
import com.lendinglibrary.domain.entity.OrganizationMember;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.OrganizationMemberRepository;
import com.lendinglibrary.infrastructure.persistence.OrganizationRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {

    @Mock OrganizationRepository organizationRepository;
    @Mock OrganizationMemberRepository organizationMemberRepository;
    @Mock UserRepository userRepository;
    @Mock UserService userService;
    @Mock SubscriptionService subscriptionService;
    @Mock PaymentService paymentService;
    @InjectMocks OrganizationService organizationService;

    private User owner;
    private PaymentInput validCard;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(UUID.randomUUID()).email("owner@example.com")
                .firstName("Owen").lastName("Owner").role(Role.MEMBER).build();
        validCard = new PaymentInput("Owen Owner", "4242424242424242", "12", "2030", "123");
    }

    @Test
    void purchase_success_chargesSeatBlockAndReturnsJoinCode() {
        var req = new OrganizationPurchaseRequest("Chennai School", SubscriptionPlan.PREMIUM, BillingCycle.MONTHLY, 10, validCard);
        when(userService.findByEmail("owner@example.com")).thenReturn(owner);
        when(organizationRepository.existsByOwner(owner)).thenReturn(false);
        when(subscriptionService.priceFor(SubscriptionPlan.PREMIUM)).thenReturn(new BigDecimal("399.00"));
        when(organizationRepository.existsByJoinCode(any())).thenReturn(false);
        when(organizationRepository.save(any())).thenAnswer(inv -> {
            Organization o = inv.getArgument(0);
            if (o.getId() == null) o.setId(UUID.randomUUID());
            return o;
        });
        when(paymentService.charge(eq(owner), eq(PaymentPurpose.ORGANIZATION_SEATS), any(), eq(new BigDecimal("3990.00")), eq(validCard)))
                .thenReturn(Payment.builder().status(PaymentStatus.SUCCEEDED).build());

        var result = organizationService.purchase(req, "owner@example.com");

        assertThat(result.name()).isEqualTo("Chennai School");
        assertThat(result.plan()).isEqualTo("premium");
        assertThat(result.seatsTotal()).isEqualTo(10);
        assertThat(result.seatsUsed()).isEqualTo(0);
        assertThat(result.amountPaid()).isEqualByComparingTo("3990.00");
        assertThat(result.joinCode()).hasSize(8);
    }

    @Test
    void purchase_alreadyOwnsOrganization_throws() {
        var req = new OrganizationPurchaseRequest("Another Org", SubscriptionPlan.BASIC, BillingCycle.MONTHLY, 5, validCard);
        when(userService.findByEmail("owner@example.com")).thenReturn(owner);
        when(organizationRepository.existsByOwner(owner)).thenReturn(true);

        assertThatThrownBy(() -> organizationService.purchase(req, "owner@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already have a business account");
    }

    @Test
    void purchase_declinedPayment_throwsWithFailureReason() {
        var req = new OrganizationPurchaseRequest("Chennai School", SubscriptionPlan.BASIC, BillingCycle.MONTHLY, 5, validCard);
        when(userService.findByEmail("owner@example.com")).thenReturn(owner);
        when(organizationRepository.existsByOwner(owner)).thenReturn(false);
        when(subscriptionService.priceFor(SubscriptionPlan.BASIC)).thenReturn(new BigDecimal("199.00"));
        when(organizationRepository.existsByJoinCode(any())).thenReturn(false);
        when(organizationRepository.save(any())).thenAnswer(inv -> {
            Organization o = inv.getArgument(0);
            if (o.getId() == null) o.setId(UUID.randomUUID());
            return o;
        });
        when(paymentService.charge(any(), any(), any(), any(), any()))
                .thenReturn(Payment.builder().status(PaymentStatus.FAILED)
                        .failureReason("Your card was declined").build());

        assertThatThrownBy(() -> organizationService.purchase(req, "owner@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("declined");
    }

    @Test
    void mine_returnsOrgWithRoster() {
        Organization org = Organization.builder().id(UUID.randomUUID()).name("Chennai School").owner(owner)
                .plan(SubscriptionPlan.PREMIUM).billingCycle(BillingCycle.MONTHLY).seatsTotal(10).seatsUsed(1)
                .joinCode("ORGCODE1").amountPaid(new BigDecimal("3990.00")).createdAt(LocalDateTime.now()).build();
        User member = User.builder().id(UUID.randomUUID()).email("member@example.com")
                .firstName("Mem").lastName("Ber").role(Role.MEMBER).build();
        OrganizationMember membership = OrganizationMember.builder().id(UUID.randomUUID())
                .organization(org).user(member).joinedAt(LocalDateTime.now()).build();
        when(userService.findByEmail("owner@example.com")).thenReturn(owner);
        when(organizationRepository.findByOwner(owner)).thenReturn(Optional.of(org));
        when(organizationMemberRepository.findByOrganizationOrderByJoinedAt(org)).thenReturn(List.of(membership));

        var result = organizationService.mine("owner@example.com");

        assertThat(result.members()).hasSize(1);
        assertThat(result.members().get(0).email()).isEqualTo("member@example.com");
    }

    @Test
    void mine_noOrganization_throws() {
        when(userService.findByEmail("owner@example.com")).thenReturn(owner);
        when(organizationRepository.findByOwner(owner)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> organizationService.mine("owner@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void join_success_incrementsSeatsAndActivatesPlan() {
        Organization org = Organization.builder().id(UUID.randomUUID()).name("Chennai School").owner(owner)
                .plan(SubscriptionPlan.PREMIUM).billingCycle(BillingCycle.MONTHLY).seatsTotal(10).seatsUsed(2)
                .joinCode("ORGCODE1").amountPaid(new BigDecimal("3990.00")).createdAt(LocalDateTime.now()).build();
        User member = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        when(userService.findByEmail("member@example.com")).thenReturn(member);
        when(organizationMemberRepository.existsByUser(member)).thenReturn(false);
        when(organizationRepository.findByJoinCode("ORGCODE1")).thenReturn(Optional.of(org));
        when(organizationRepository.save(any())).thenReturn(org);
        SubscriptionResponse expected = SubscriptionResponse.from(
                com.lendinglibrary.domain.entity.Subscription.builder()
                        .id(UUID.randomUUID()).plan(SubscriptionPlan.PREMIUM).monthlyPrice(new BigDecimal("399.00"))
                        .billingCycle(BillingCycle.MONTHLY).startDate(LocalDateTime.now())
                        .status(com.lendinglibrary.domain.enums.SubscriptionStatus.ACTIVE).maxConcurrentLoans(Integer.MAX_VALUE)
                        .build());
        when(subscriptionService.activateGiftedPlan(member, SubscriptionPlan.PREMIUM, BillingCycle.MONTHLY))
                .thenReturn(expected);

        var result = organizationService.join("orgcode1", "member@example.com");

        assertThat(result).isEqualTo(expected);
        assertThat(org.getSeatsUsed()).isEqualTo(3);
        verify(organizationMemberRepository).save(any(OrganizationMember.class));
    }

    @Test
    void join_unknownCode_throws() {
        User member = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        when(userService.findByEmail("member@example.com")).thenReturn(member);
        when(organizationMemberRepository.existsByUser(member)).thenReturn(false);
        when(organizationRepository.findByJoinCode("BADCODE1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> organizationService.join("badcode1", "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unknown organization code");
    }

    @Test
    void join_noSeatsLeft_throws() {
        Organization org = Organization.builder().id(UUID.randomUUID()).owner(owner)
                .plan(SubscriptionPlan.BASIC).billingCycle(BillingCycle.MONTHLY).seatsTotal(2).seatsUsed(2)
                .joinCode("ORGCODE1").amountPaid(new BigDecimal("398.00")).createdAt(LocalDateTime.now()).build();
        User member = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        when(userService.findByEmail("member@example.com")).thenReturn(member);
        when(organizationMemberRepository.existsByUser(member)).thenReturn(false);
        when(organizationRepository.findByJoinCode("ORGCODE1")).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> organizationService.join("orgcode1", "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no seats left");
    }

    @Test
    void join_alreadyInAnOrganization_throws() {
        User member = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        when(userService.findByEmail("member@example.com")).thenReturn(member);
        when(organizationMemberRepository.existsByUser(member)).thenReturn(true);

        assertThatThrownBy(() -> organizationService.join("orgcode1", "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already part of an organization");
    }

    @Test
    void joinAtRegistration_validCode_activatesAndReturnsOrg() {
        Organization org = Organization.builder().id(UUID.randomUUID()).owner(owner)
                .plan(SubscriptionPlan.BASIC).billingCycle(BillingCycle.MONTHLY).seatsTotal(5).seatsUsed(1)
                .joinCode("ORGCODE1").amountPaid(new BigDecimal("995.00")).createdAt(LocalDateTime.now()).build();
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();
        when(organizationRepository.findByJoinCode("ORGCODE1")).thenReturn(Optional.of(org));
        when(organizationRepository.save(any())).thenReturn(org);

        var result = organizationService.joinAtRegistration(newUser, "orgcode1");

        assertThat(result).isPresent();
        assertThat(result.get().getPlan()).isEqualTo(SubscriptionPlan.BASIC);
        assertThat(org.getSeatsUsed()).isEqualTo(2);
        verify(subscriptionService).activateGiftedPlan(newUser, SubscriptionPlan.BASIC, BillingCycle.MONTHLY);
    }

    @Test
    void joinAtRegistration_fullOrganization_returnsEmpty_noActivation() {
        Organization org = Organization.builder().id(UUID.randomUUID()).owner(owner)
                .plan(SubscriptionPlan.BASIC).billingCycle(BillingCycle.MONTHLY).seatsTotal(1).seatsUsed(1)
                .joinCode("ORGCODE1").amountPaid(new BigDecimal("199.00")).createdAt(LocalDateTime.now()).build();
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();
        when(organizationRepository.findByJoinCode("ORGCODE1")).thenReturn(Optional.of(org));

        var result = organizationService.joinAtRegistration(newUser, "orgcode1");

        assertThat(result).isEmpty();
        verify(subscriptionService, never()).activateGiftedPlan(any(), any(), any());
    }

    @Test
    void joinAtRegistration_unknownCode_returnsEmpty() {
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();
        when(organizationRepository.findByJoinCode("BADCODE1")).thenReturn(Optional.empty());

        var result = organizationService.joinAtRegistration(newUser, "badcode1");

        assertThat(result).isEmpty();
    }

    @Test
    void joinAtRegistration_blankCode_returnsEmpty_noLookup() {
        User newUser = User.builder().id(UUID.randomUUID()).email("new@example.com").role(Role.MEMBER).build();

        var result = organizationService.joinAtRegistration(newUser, null);

        assertThat(result).isEmpty();
        verify(organizationRepository, never()).findByJoinCode(any());
    }

    @Test
    void removeMember_success_decrementsSeatsAndCancelsSubscription() {
        Organization org = Organization.builder().id(UUID.randomUUID()).owner(owner)
                .plan(SubscriptionPlan.PREMIUM).billingCycle(BillingCycle.MONTHLY).seatsTotal(10).seatsUsed(3)
                .joinCode("ORGCODE1").amountPaid(new BigDecimal("3990.00")).createdAt(LocalDateTime.now()).build();
        User member = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        OrganizationMember membership = OrganizationMember.builder().id(UUID.randomUUID())
                .organization(org).user(member).joinedAt(LocalDateTime.now()).build();
        when(userService.findByEmail("owner@example.com")).thenReturn(owner);
        when(organizationRepository.findByOwner(owner)).thenReturn(Optional.of(org));
        when(userRepository.findById(member.getId())).thenReturn(Optional.of(member));
        when(organizationMemberRepository.findByOrganizationAndUser(org, member)).thenReturn(Optional.of(membership));

        organizationService.removeMember("owner@example.com", member.getId());

        assertThat(org.getSeatsUsed()).isEqualTo(2);
        verify(organizationMemberRepository).delete(membership);
        verify(subscriptionService).cancelActiveSubscription(member);
    }

    @Test
    void removeMember_notAMember_throws() {
        Organization org = Organization.builder().id(UUID.randomUUID()).owner(owner)
                .plan(SubscriptionPlan.PREMIUM).billingCycle(BillingCycle.MONTHLY).seatsTotal(10).seatsUsed(0)
                .joinCode("ORGCODE1").amountPaid(new BigDecimal("3990.00")).createdAt(LocalDateTime.now()).build();
        User stranger = User.builder().id(UUID.randomUUID()).email("stranger@example.com").role(Role.MEMBER).build();
        when(userService.findByEmail("owner@example.com")).thenReturn(owner);
        when(organizationRepository.findByOwner(owner)).thenReturn(Optional.of(org));
        when(userRepository.findById(stranger.getId())).thenReturn(Optional.of(stranger));
        when(organizationMemberRepository.findByOrganizationAndUser(org, stranger)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> organizationService.removeMember("owner@example.com", stranger.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("isn't a member");
    }
}
