package com.lendinglibrary.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.BookDocument;
import com.lendinglibrary.infrastructure.events.BookSearchConsumer;
import com.lendinglibrary.infrastructure.events.DomainEvent;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookSearchConsumerTest {

    @Mock BookRepository bookRepository;
    @Mock ElasticsearchOperations elasticsearchOperations;

    private BookSearchConsumer consumer;
    private Book book;

    @BeforeEach
    void setUp() {
        consumer = new BookSearchConsumer(
                new ObjectMapper().findAndRegisterModules(), bookRepository, elasticsearchOperations);
        book = Book.builder().id(UUID.randomUUID()).title("The Alchemist").author("Paulo Coelho")
                .isbn("978-1").totalCopies(3).availableCopies(2).purchasePrice(BigDecimal.TEN).build();
    }

    private String payload(String type, String aggregateId, Map<String, Object> data) throws Exception {
        var event = new DomainEvent(UUID.randomUUID(), type, aggregateId, LocalDateTime.now(), data);
        return new ObjectMapper().findAndRegisterModules().writeValueAsString(event);
    }

    @Test
    void onBookEvent_updated_reindexesFromPostgres() throws Exception {
        when(bookRepository.findById(book.getId())).thenReturn(Optional.of(book));

        consumer.onBookEvent(payload("book.updated", book.getId().toString(),
                Map.of("action", "updated", "title", book.getTitle(), "author", book.getAuthor())));

        verify(elasticsearchOperations).save(argThat((BookDocument d) ->
                d.getId().equals(book.getId().toString()) && d.getTitle().equals("The Alchemist")));
    }

    @Test
    void onBookEvent_deletedBook_removesFromIndex() throws Exception {
        UUID deletedId = UUID.randomUUID();
        when(bookRepository.findById(deletedId)).thenReturn(Optional.empty());

        consumer.onBookEvent(payload("book.updated", deletedId.toString(),
                Map.of("action", "updated", "title", "X", "author", "Y")));

        verify(elasticsearchOperations).delete(deletedId.toString(), BookDocument.class);
        verify(elasticsearchOperations, never()).save(any(BookDocument.class));
    }

    @Test
    void onLoanEvent_created_reindexesToReflectNewAvailability() throws Exception {
        when(bookRepository.findById(book.getId())).thenReturn(Optional.of(book));

        consumer.onLoanEvent(payload("loan.created", "loan-1",
                Map.of("userId", UUID.randomUUID().toString(), "bookId", book.getId().toString(), "bookTitle", book.getTitle())));

        verify(elasticsearchOperations).save(any(BookDocument.class));
    }

    @Test
    void onLoanEvent_renewed_doesNotReindex() throws Exception {
        consumer.onLoanEvent(payload("loan.renewed", "loan-1",
                Map.of("userId", UUID.randomUUID().toString(), "bookId", book.getId().toString(), "bookTitle", book.getTitle())));

        verifyNoInteractions(bookRepository, elasticsearchOperations);
    }
}
