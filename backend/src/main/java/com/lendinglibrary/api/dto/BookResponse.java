package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Book;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String title,
        String author,
        String isbn,
        String description,
        int totalCopies,
        int availableCopies,
        boolean available,
        BigDecimal purchasePrice,
        String category,
        String genre,
        String language,
        Integer pageCount,
        Double rating,
        String cover,
        Integer publishedYear,
        LocalDateTime createdAt
) {
    public static BookResponse from(Book b) {
        return new BookResponse(
                b.getId(), b.getTitle(), b.getAuthor(), b.getIsbn(),
                b.getDescription(), b.getTotalCopies(), b.getAvailableCopies(),
                b.getAvailableCopies() > 0,
                b.getPurchasePrice(), b.getCategory(), b.getCategory(),
                b.getLanguage(), b.getPageCount(), b.getRating(),
                b.getCoverUrl(), b.getPublishedYear(), b.getCreatedAt()
        );
    }
}
