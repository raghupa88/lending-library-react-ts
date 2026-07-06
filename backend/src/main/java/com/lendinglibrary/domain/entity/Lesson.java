package com.lendinglibrary.domain.entity;

import com.lendinglibrary.domain.enums.LessonKind;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "lessons")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    private CourseModule module;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LessonKind kind;

    @Column(name = "content_url")
    private String contentUrl;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "est_minutes")
    private Integer estMinutes;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
