package com.lendinglibrary.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "venues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String address;

    @Column(nullable = false)
    private String city;

    @Column(name = "capacity_default", nullable = false)
    private int capacityDefault;
}
