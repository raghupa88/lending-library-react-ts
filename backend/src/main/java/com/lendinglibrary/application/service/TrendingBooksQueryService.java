package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.TrendingBookResponse;

import java.util.List;

/** Top-borrowed books, backed by Cassandra's {@code book_borrow_counts} counter table — see ADR-025. */
public interface TrendingBooksQueryService {
    List<TrendingBookResponse> topN(int n);
}
