package com.lendinglibrary.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Marks a domain event as handled by a consumer. Kafka delivery is
 * at-least-once, so consumers must be idempotent: check this table before
 * acting on an event, insert into it afterward (or first, inside the same
 * transaction as the side effect).
 */
@Entity
@Table(name = "processed_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProcessedEvent {

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @CreationTimestamp
    @Column(name = "processed_at", nullable = false, updatable = false)
    private LocalDateTime processedAt;
}
