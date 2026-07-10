package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@Profile("!elasticsearch")
@RequiredArgsConstructor
public class PostgresBookSearchQueryService implements BookSearchQueryService {

    private final BookRepository bookRepository;

    @Override
    public PagedResponse<BookResponse> search(
            String search, String category, String language, Boolean available, int page, int size) {
        var pageable = PageRequest.of(page, size);
        var result = bookRepository.findWithFilters(search, category, language, available, pageable);
        return PagedResponse.from(result.map(BookResponse::from));
    }
}
