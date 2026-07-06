package com.lendinglibrary.events;

import com.lendinglibrary.domain.entity.OutboxEvent;
import com.lendinglibrary.infrastructure.events.OutboxPublisher;
import com.lendinglibrary.infrastructure.persistence.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxPublisherTest {

    @Mock OutboxEventRepository outboxEventRepository;
    @Mock KafkaTemplate<String, String> kafkaTemplate;
    @InjectMocks OutboxPublisher publisher;

    private OutboxEvent event(String topic, String aggregateId, String payload) {
        return OutboxEvent.builder()
                .id(UUID.randomUUID()).topic(topic).aggregateId(aggregateId)
                .eventType("loan.created").payload(payload).attempts(0)
                .build();
    }

    @Test
    void publishPending_marksSuccessfullySentEventsAsPublished() {
        var e = event("library.loan.events", "loan-1", "{\"type\":\"loan.created\"}");
        when(outboxEventRepository.findUnpublishedBatch(any())).thenReturn(List.of(e));
        when(kafkaTemplate.send(eq("library.loan.events"), eq("loan-1"), eq(e.getPayload())))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        publisher.publishPending();

        assertThat(e.getPublishedAt()).isNotNull();
        assertThat(e.getAttempts()).isZero();
        verify(outboxEventRepository).save(e);
    }

    @Test
    void publishPending_leavesFailedSendsUnpublishedAndIncrementsAttempts() {
        var e = event("library.loan.events", "loan-2", "{\"type\":\"loan.created\"}");
        when(outboxEventRepository.findUnpublishedBatch(any())).thenReturn(List.of(e));
        CompletableFuture<SendResult<String, String>> failed = new CompletableFuture<>();
        failed.completeExceptionally(new RuntimeException("broker unreachable"));
        when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenReturn(failed);

        publisher.publishPending();

        assertThat(e.getPublishedAt()).isNull();
        assertThat(e.getAttempts()).isEqualTo(1);
        verify(outboxEventRepository).save(e);
    }

    @Test
    void publishPending_publishesEachRowInTheBatchIndependently() {
        var ok = event("library.loan.events", "loan-3", "{}");
        var bad = event("library.loan.events", "loan-4", "{}");
        when(outboxEventRepository.findUnpublishedBatch(any())).thenReturn(List.of(ok, bad));
        when(kafkaTemplate.send(eq("library.loan.events"), eq("loan-3"), any()))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));
        CompletableFuture<SendResult<String, String>> failed = new CompletableFuture<>();
        failed.completeExceptionally(new RuntimeException("boom"));
        when(kafkaTemplate.send(eq("library.loan.events"), eq("loan-4"), any())).thenReturn(failed);

        publisher.publishPending();

        assertThat(ok.getPublishedAt()).isNotNull();
        assertThat(bad.getPublishedAt()).isNull();
    }
}
