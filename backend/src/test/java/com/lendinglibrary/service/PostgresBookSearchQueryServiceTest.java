package com.lendinglibrary.service;

import com.lendinglibrary.application.service.PostgresBookSearchQueryService;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostgresBookSearchQueryServiceTest {

    @Mock BookRepository bookRepository;

    @Test
    void search_delegatesToFindWithFilters() {
        var book = Book.builder().id(UUID.randomUUID()).title("The Alchemist").author("Paulo Coelho")
                .isbn("978-0000000001").totalCopies(3).availableCopies(2).purchasePrice(BigDecimal.TEN).build();
        var page = new PageImpl<>(List.of(book), PageRequest.of(0, 20), 1);
        when(bookRepository.findWithFilters(eq("alchemist"), isNull(), isNull(), isNull(), any()))
                .thenReturn(page);

        var service = new PostgresBookSearchQueryService(bookRepository);
        var result = service.search("alchemist", null, null, null, 0, 20);

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).title()).isEqualTo("The Alchemist");
        assertThat(result.totalElements()).isEqualTo(1);
    }
}
