package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.application.service.BookSearchQueryService;
import com.lendinglibrary.application.service.BookService;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock BookRepository bookRepository;
    @Mock BookSearchQueryService bookSearchQueryService;
    @InjectMocks BookService bookService;

    private Book makeBook(String title) {
        return Book.builder().id(UUID.randomUUID()).title(title).author("Author")
                .isbn("978-000000000" + title.length()).totalCopies(3).availableCopies(2)
                .purchasePrice(BigDecimal.TEN).build();
    }

    @Test
    void list_delegatesToSearchQueryService() {
        var books = List.of(makeBook("Book A"), makeBook("Book B"));
        var page = new PageImpl<>(books.stream().map(BookResponse::from).toList(), PageRequest.of(0, 20), 2);
        when(bookSearchQueryService.search(isNull(), isNull(), isNull(), isNull(), eq(0), eq(20)))
                .thenReturn(PagedResponse.from(page));

        var result = bookService.list(null, null, null, null, 0, 20);

        assertThat(result.content()).hasSize(2);
        assertThat(result.totalElements()).isEqualTo(2);
    }

    @Test
    void getById_found() {
        Book book = makeBook("Test");
        when(bookRepository.findById(book.getId())).thenReturn(Optional.of(book));

        var result = bookService.getById(book.getId());

        assertThat(result.title()).isEqualTo("Test");
    }

    @Test
    void getById_notFound_throws() {
        UUID id = UUID.randomUUID();
        when(bookRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookService.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
