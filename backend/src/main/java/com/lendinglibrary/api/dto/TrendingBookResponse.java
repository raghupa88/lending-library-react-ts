package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Book;

import java.util.UUID;

public record TrendingBookResponse(
        UUID bookId,
        String title,
        String author,
        long borrowCount
) {
    public static TrendingBookResponse of(Book book, long borrowCount) {
        return new TrendingBookResponse(book.getId(), book.getTitle(), book.getAuthor(), borrowCount);
    }
}
