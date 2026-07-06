package com.lendinglibrary.infrastructure.events;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Wire envelope for every event on the outbox topics. {@code data} is a
 * flat, JSON-serializable map — deliberately not a typed class per event,
 * so new fields can be added without a shared schema-evolution dependency
 * between producer and consumers (documented per-topic in docs/events.md).
 */
public record DomainEvent(
        UUID eventId,
        String type,
        String aggregateId,
        LocalDateTime occurredAt,
        Map<String, Object> data
) {
    public static DomainEvent of(String type, String aggregateId, Map<String, Object> data) {
        return new DomainEvent(UUID.randomUUID(), type, aggregateId, LocalDateTime.now(), data);
    }
}
