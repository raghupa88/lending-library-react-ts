package com.lendinglibrary.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/** Named CourseModule (not "Module") to avoid any confusion with java.lang.Module. */
@Entity
@Table(name = "course_modules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseModule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private String title;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
