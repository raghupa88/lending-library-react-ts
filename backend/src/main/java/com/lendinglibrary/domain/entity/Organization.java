package com.lendinglibrary.domain.entity;

import com.lendinglibrary.domain.enums.BillingCycle;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "organizations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private BillingCycle billingCycle;

    @Column(name = "seats_total", nullable = false)
    private Integer seatsTotal;

    @Column(name = "seats_used", nullable = false)
    @Builder.Default
    private Integer seatsUsed = 0;

    @Column(name = "join_code", nullable = false, unique = true, length = 20)
    private String joinCode;

    @Column(name = "amount_paid", nullable = false, precision = 10, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
