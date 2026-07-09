package com.lendinglibrary.service;

import com.lendinglibrary.application.service.CassandraTrendingBooksQueryService;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.BookBorrowCount;
import com.lendinglibrary.infrastructure.persistence.BookBorrowCountRepository;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CassandraTrendingBooksQueryServiceTest {

    @Mock BookBorrowCountRepository bookBorrowCountRepository;
    @Mock BookRepository bookRepository;

    private Book book(UUID id, String title) {
        return Book.builder().id(id).title(title).author("Some Author").isbn(UUID.randomUUID().toString())
                .totalCopies(3).availableCopies(1).purchasePrice(BigDecimal.TEN).build();
    }

    @Test
    void topN_sortsDescendingAndLimits() {
        UUID popular = UUID.randomUUID();
        UUID lessPopular = UUID.randomUUID();

        when(bookBorrowCountRepository.findAll()).thenReturn(List.of(
                BookBorrowCount.builder().bookId(lessPopular).borrowCount(2).build(),
                BookBorrowCount.builder().bookId(popular).borrowCount(9).build()
        ));
        when(bookRepository.findById(popular)).thenReturn(Optional.of(book(popular, "The Alchemist")));
        when(bookRepository.findById(lessPopular)).thenReturn(Optional.of(book(lessPopular, "Siddhartha")));

        var service = new CassandraTrendingBooksQueryService(bookBorrowCountRepository, bookRepository);
        var result = service.topN(2);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).title()).isEqualTo("The Alchemist");
        assertThat(result.get(0).borrowCount()).isEqualTo(9);
        assertThat(result.get(1).title()).isEqualTo("Siddhartha");
    }

    @Test
    void topN_skipsCountsForBooksThatNoLongerExist() {
        UUID deleted = UUID.randomUUID();

        when(bookBorrowCountRepository.findAll()).thenReturn(List.of(
                BookBorrowCount.builder().bookId(deleted).borrowCount(5).build()
        ));
        when(bookRepository.findById(deleted)).thenReturn(Optional.empty());

        var service = new CassandraTrendingBooksQueryService(bookBorrowCountRepository, bookRepository);

        assertThat(service.topN(5)).isEmpty();
    }
}
