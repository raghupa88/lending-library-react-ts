package com.lendinglibrary.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "question_options")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private String label;

    @Column(name = "is_correct", nullable = false)
    @Builder.Default
    private boolean correct = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
