package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.TrendingBookResponse;
import com.lendinglibrary.domain.entity.BookBorrowCount;
import com.lendinglibrary.infrastructure.persistence.BookBorrowCountRepository;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@Profile("cassandra")
@RequiredArgsConstructor
public class CassandraTrendingBooksQueryService implements TrendingBooksQueryService {

    private final BookBorrowCountRepository bookBorrowCountRepository;
    private final BookRepository bookRepository;

    @Override
    public List<TrendingBookResponse> topN(int n) {
        // Counter tables can't be ORDER BY'd on the counter value in CQL (see
        // cql/schema.cql) — reading every row and sorting in the app is
        // acceptable at this catalog's size.
        return bookBorrowCountRepository.findAll().stream()
                .sorted(Comparator.comparingLong(BookBorrowCount::getBorrowCount).reversed())
                .limit(n)
                .flatMap(count -> bookRepository.findById(count.getBookId()).stream()
                        .map(book -> TrendingBookResponse.of(book, count.getBorrowCount())))
                .toList();
    }
}
