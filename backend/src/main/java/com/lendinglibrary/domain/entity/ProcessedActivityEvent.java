package com.lendinglibrary.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ActivityConsumer's own idempotency marker — deliberately separate from
 * {@link ProcessedEvent} (NotificationConsumer's table). That table is
 * keyed only by event_id with no consumer discriminator, so sharing it
 * between two independent consumer groups would mean whichever consumer
 * processed an event first marks it "done" globally, silently starving
 * the other. See ADR-025.
 */
@Entity
@Table(name = "processed_activity_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProcessedActivityEvent {

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @CreationTimestamp
    @Column(name = "processed_at", nullable = false, updatable = false)
    private LocalDateTime processedAt;
}
