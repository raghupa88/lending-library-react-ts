package com.lendinglibrary.infrastructure.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.BookDocument;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.function.Consumer;

/**
 * Keeps the {@code books} Elasticsearch index in sync with Postgres. Both
 * {@code book.updated} (admin catalog edits) and {@code loan.created}/
 * {@code loan.returned} (which change {@code availableCopies}, the
 * index's availability-filter field) trigger the same re-index: fetch the
 * current row and overwrite the document. Writing full current state
 * instead of applying a delta makes this naturally idempotent under
 * Kafka's at-least-once redelivery — no processed-events table needed,
 * unlike ActivityConsumer's counter increments (see ADR-025/026).
 */
@Component
@Profile("kafka & elasticsearch")
@RequiredArgsConstructor
@Slf4j
public class BookSearchConsumer {

    private static final String GROUP = "book-search";

    private final ObjectMapper objectMapper;
    private final BookRepository bookRepository;
    private final ElasticsearchOperations elasticsearchOperations;

    @KafkaListener(topics = Topics.BOOK_EVENTS, groupId = GROUP)
    public void onBookEvent(String payload) {
        handle(payload, event -> reindex(UUID.fromString(event.aggregateId())));
    }

    @KafkaListener(topics = Topics.LOAN_EVENTS, groupId = GROUP)
    public void onLoanEvent(String payload) {
        handle(payload, event -> {
            if (!"loan.created".equals(event.type()) && !"loan.returned".equals(event.type())) {
                return; // loan.renewed doesn't change availableCopies
            }
            reindex(UUID.fromString((String) event.data().get("bookId")));
        });
    }

    private void handle(String payload, Consumer<DomainEvent> action) {
        try {
            action.accept(objectMapper.readValue(payload, DomainEvent.class));
        } catch (Exception e) {
            log.error("Unparseable event on book-search topic, skipping: {}", e.getMessage());
        }
    }

    private void reindex(UUID bookId) {
        bookRepository.findById(bookId).ifPresentOrElse(
                book -> elasticsearchOperations.save(BookDocument.from(book)),
                () -> elasticsearchOperations.delete(bookId.toString(), BookDocument.class));
    }
}
