package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.PagedResponse;

/**
 * Backs {@code GET /books}'s search/filter. Elasticsearch-backed when the
 * {@code elasticsearch} profile is active, or the plain Postgres LIKE
 * query this app always had otherwise — unlike the Cassandra branch's
 * empty-list fallbacks, search has no reasonable "empty" default, so the
 * fallback here is a full, real implementation, not a no-op. See ADR-026.
 */
public interface BookSearchQueryService {
    PagedResponse<BookResponse> search(
            String search, String category, String language, Boolean available, int page, int size);
}
