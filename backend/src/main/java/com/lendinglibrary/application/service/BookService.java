package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.BookRequest;
import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;

    public PagedResponse<BookResponse> list(String search, String category, String language,
                                            Boolean available, int page, int size) {
        var pageable = PageRequest.of(page, size);
        var result = bookRepository.findWithFilters(search, category, language, available, pageable);
        return PagedResponse.from(result.map(BookResponse::from));
    }

    public BookResponse getById(UUID id) {
        return BookResponse.from(findOrThrow(id));
    }

    @Transactional
    public BookResponse create(BookRequest req) {
        Book book = Book.builder()
                .title(req.title()).author(req.author()).isbn(req.isbn())
                .description(req.description()).totalCopies(req.totalCopies())
                .availableCopies(req.totalCopies()).purchasePrice(req.purchasePrice())
                .category(req.category()).language(req.language()).pageCount(req.pageCount())
                .rating(req.rating()).coverUrl(req.coverUrl()).publishedYear(req.publishedYear())
                .build();
        return BookResponse.from(bookRepository.save(book));
    }

    @Transactional
    public BookResponse update(UUID id, BookRequest req) {
        Book book = findOrThrow(id);
        book.setTitle(req.title());
        book.setAuthor(req.author());
        book.setIsbn(req.isbn());
        book.setDescription(req.description());
        book.setTotalCopies(req.totalCopies());
        book.setPurchasePrice(req.purchasePrice());
        book.setCategory(req.category());
        book.setLanguage(req.language());
        book.setPageCount(req.pageCount());
        book.setRating(req.rating());
        book.setCoverUrl(req.coverUrl());
        book.setPublishedYear(req.publishedYear());
        return BookResponse.from(bookRepository.save(book));
    }

    public Book findOrThrow(UUID id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found: " + id));
    }
}
