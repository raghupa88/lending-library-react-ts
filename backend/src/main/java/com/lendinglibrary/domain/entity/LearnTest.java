package com.lendinglibrary.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/** Named LearnTest (not "Test") to avoid colliding with org.junit.jupiter.api.Test. */
@Entity
@Table(name = "tests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LearnTest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private String title;

    @Column(name = "pass_percent", nullable = false)
    private int passPercent;

    @Column(name = "time_limit_min", nullable = false)
    private int timeLimitMin;

    @Column(name = "attempts_allowed", nullable = false)
    private int attemptsAllowed;
}
