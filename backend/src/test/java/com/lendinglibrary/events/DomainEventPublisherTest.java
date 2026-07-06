package com.lendinglibrary.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.OutboxEventRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the outbox write actually lands in the same transaction as the
 * caller, against the real Flyway schema (V4__events_and_notifications.sql)
 * — the entire point of the pattern.
 */
@DataJpaTest
class DomainEventPublisherTest {

    @Autowired OutboxEventRepository outboxEventRepository;
    @Autowired UserRepository userRepository;

    @Test
    @Transactional
    void publish_writesAJsonRowContainingTheEventEnvelope() {
        DomainEventPublisher publisher = new DomainEventPublisher(
                outboxEventRepository, new ObjectMapper().findAndRegisterModules());
        User user = userRepository.findByEmail("member@example.com").orElseThrow();

        publisher.publish(Topics.LOAN_EVENTS, "loan.created", "loan-123",
                Map.of("userEmail", user.getEmail(), "bookTitle", "The Alchemist"));

        var rows = outboxEventRepository.findAll();
        assertThat(rows).hasSize(1);
        var row = rows.get(0);
        assertThat(row.getTopic()).isEqualTo(Topics.LOAN_EVENTS);
        assertThat(row.getAggregateId()).isEqualTo("loan-123");
        assertThat(row.getEventType()).isEqualTo("loan.created");
        assertThat(row.getPublishedAt()).isNull();
        assertThat(row.getPayload()).contains("\"type\":\"loan.created\"").contains("The Alchemist");
    }
}
