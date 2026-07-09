package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.BookDocument;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Profile("elasticsearch")
@RequiredArgsConstructor
public class ElasticsearchBookSearchQueryService implements BookSearchQueryService {

    private final ElasticsearchOperations elasticsearchOperations;
    private final BookRepository bookRepository;

    @Override
    public PagedResponse<BookResponse> search(
            String search, String category, String language, Boolean available, int page, int size) {
        Criteria criteria = new Criteria();
        if (search != null && !search.isBlank()) {
            criteria = criteria.and(new Criteria("title").contains(search)
                    .or(new Criteria("author").contains(search)));
        }
        if (category != null) {
            criteria = criteria.and(new Criteria("category").is(category));
        }
        if (language != null) {
            criteria = criteria.and(new Criteria("language").is(language));
        }
        if (available != null) {
            criteria = available
                    ? criteria.and(new Criteria("availableCopies").greaterThan(0))
                    : criteria.and(new Criteria("availableCopies").is(0));
        }

        var pageable = PageRequest.of(page, size);
        CriteriaQuery query = new CriteriaQuery(criteria);
        query.setPageable(pageable);
        SearchHits<BookDocument> hits = elasticsearchOperations.search(query, BookDocument.class);

        // Elasticsearch resolves matching IDs and relevance order; the
        // response content itself is still built from Postgres, the one
        // source of truth for everything BookResponse needs beyond what
        // BookDocument carries for search/filter.
        List<UUID> orderedIds = hits.getSearchHits().stream()
                .map(SearchHit::getContent)
                .map(BookDocument::getId)
                .map(UUID::fromString)
                .toList();
        Map<UUID, Book> byId = new LinkedHashMap<>();
        bookRepository.findAllById(orderedIds).forEach(book -> byId.put(book.getId(), book));

        List<BookResponse> content = orderedIds.stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .map(BookResponse::from)
                .toList();

        return PagedResponse.from(new PageImpl<>(content, pageable, hits.getTotalHits()));
    }
}
