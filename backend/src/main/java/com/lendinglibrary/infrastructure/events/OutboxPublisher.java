package com.lendinglibrary.infrastructure.events;

import com.lendinglibrary.domain.entity.OutboxEvent;
import com.lendinglibrary.infrastructure.persistence.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Polls the outbox table and publishes unpublished rows to Kafka, keyed by
 * aggregate id so events for the same aggregate stay ordered on one
 * partition. Only active with {@code SPRING_PROFILES_ACTIVE} including
 * {@code kafka} (docker-compose sets this) — without a broker configured,
 * this bean simply doesn't exist, so dev/test never attempt a connection.
 */
@Component
@Profile("kafka")
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {

    private static final int BATCH_SIZE = 50;
    private static final long SEND_TIMEOUT_SECONDS = 10;

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelayString = "${outbox.poll-interval-ms:2000}")
    public void publishPending() {
        List<OutboxEvent> batch = outboxEventRepository.findUnpublishedBatch(PageRequest.of(0, BATCH_SIZE));
        for (OutboxEvent event : batch) {
            publishOne(event);
        }
    }

    @Transactional
    void publishOne(OutboxEvent event) {
        try {
            kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload())
                    .get(SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            event.setPublishedAt(LocalDateTime.now());
            outboxEventRepository.save(event);
        } catch (Exception e) {
            // Left unpublished for the next poll; attempts is logged context only,
            // not a cutoff — outbox delivery is at-least-once by design.
            event.setAttempts(event.getAttempts() + 1);
            outboxEventRepository.save(event);
            log.warn("Failed to publish outbox event {} (attempt {}): {}",
                    event.getId(), event.getAttempts(), e.getMessage());
        }
    }
}
