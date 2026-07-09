package com.lendinglibrary.service;

import com.lendinglibrary.application.service.ElasticsearchBookSearchQueryService;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.BookDocument;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ElasticsearchBookSearchQueryServiceTest {

    @Mock ElasticsearchOperations elasticsearchOperations;
    @Mock BookRepository bookRepository;

    @SuppressWarnings("unchecked")
    private SearchHit<BookDocument> hitFor(BookDocument doc) {
        SearchHit<BookDocument> hit = mock(SearchHit.class);
        when(hit.getContent()).thenReturn(doc);
        return hit;
    }

    @Test
    void search_ordersByRelevanceAndBuildsResponsesFromPostgres() {
        UUID popularId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        var popularDoc = BookDocument.builder().id(popularId.toString()).title("The Alchemist").build();
        var otherDoc = BookDocument.builder().id(otherId.toString()).title("Siddhartha").build();

        SearchHit<BookDocument> popularHit = hitFor(popularDoc);
        SearchHit<BookDocument> otherHit = hitFor(otherDoc);

        @SuppressWarnings("unchecked")
        SearchHits<BookDocument> hits = mock(SearchHits.class);
        when(hits.getSearchHits()).thenReturn(List.of(popularHit, otherHit));
        when(hits.getTotalHits()).thenReturn(2L);
        when(elasticsearchOperations.search(any(Query.class), org.mockito.ArgumentMatchers.eq(BookDocument.class)))
                .thenReturn(hits);

        var popularBook = Book.builder().id(popularId).title("The Alchemist").author("Paulo Coelho")
                .isbn("978-1").totalCopies(3).availableCopies(2).purchasePrice(BigDecimal.TEN).build();
        var otherBook = Book.builder().id(otherId).title("Siddhartha").author("Hermann Hesse")
                .isbn("978-2").totalCopies(3).availableCopies(1).purchasePrice(BigDecimal.TEN).build();
        when(bookRepository.findAllById(List.of(popularId, otherId))).thenReturn(List.of(otherBook, popularBook));

        var service = new ElasticsearchBookSearchQueryService(elasticsearchOperations, bookRepository);
        var result = service.search("alchemist", null, null, null, 0, 20);

        assertThat(result.totalElements()).isEqualTo(2);
        // Order follows Elasticsearch's relevance ranking, not Postgres's findAllById order.
        assertThat(result.content()).extracting("title").containsExactly("The Alchemist", "Siddhartha");
    }
}
