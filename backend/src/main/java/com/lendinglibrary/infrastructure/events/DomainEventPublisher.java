package com.lendinglibrary.infrastructure.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.OutboxEvent;
import com.lendinglibrary.infrastructure.persistence.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Writes a domain event to the outbox table. Callers invoke this from
 * inside their own {@code @Transactional} business method (borrow, return,
 * subscribe, ...) so the event row commits atomically with the business
 * change it describes — the whole point of the outbox pattern.
 * {@code Propagation.MANDATORY} enforces that: calling this outside a
 * transaction is a bug, not a silently-dropped event.
 */
@Component
@RequiredArgsConstructor
public class DomainEventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    @SneakyThrows
    public void publish(String topic, String eventType, String aggregateId, Map<String, Object> data) {
        DomainEvent event = DomainEvent.of(eventType, aggregateId, data);
        outboxEventRepository.save(OutboxEvent.builder()
                .topic(topic)
                .aggregateId(aggregateId)
                .eventType(eventType)
                .payload(objectMapper.writeValueAsString(event))
                .build());
    }
}
