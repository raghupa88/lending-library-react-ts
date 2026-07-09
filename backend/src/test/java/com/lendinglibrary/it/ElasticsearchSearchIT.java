package com.lendinglibrary.it;

import com.lendinglibrary.application.service.BookSearchQueryService;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.BookDocument;
import com.lendinglibrary.infrastructure.persistence.BookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.elasticsearch.ElasticsearchContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Proves the {@code books} index mapping and the Elasticsearch-backed
 * search path actually work against a real cluster — the same job
 * FlywayMigrationIT/CassandraSchemaIT do for their own stores. Uses
 * {@code @TestPropertySource} rather than relying on the main
 * {@code elasticsearch} profile's YAML block for the same reason
 * CassandraSchemaIT does (ADR-025): {@code src/test/resources/
 * application.yml} replaces, not merges with, the main file, so that
 * block is never visible here — {@code @ActiveProfiles} still activates
 * the {@code @Profile("elasticsearch")}-gated beans themselves (profile
 * activation isn't blocked by the same shadowing), and
 * {@code @ServiceConnection} supplies the cluster URI directly.
 *
 * <p>The exclude override below re-enables only Elasticsearch's own
 * auto-configuration classes, not the whole shared list — clearing it
 * entirely would also re-enable Cassandra's, and unlike Elasticsearch's
 * lazy REST client, Cassandra's CqlSession bean connects synchronously
 * and fails hard with no real cluster in this test's context (found via a
 * real CI failure, not guessed).
 */
@SpringBootTest
@ActiveProfiles("elasticsearch")
@TestPropertySource(properties = "spring.autoconfigure.exclude="
        + "org.springframework.boot.autoconfigure.cassandra.CassandraAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.data.cassandra.CassandraDataAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.data.cassandra.CassandraRepositoriesAutoConfiguration")
@Testcontainers
class ElasticsearchSearchIT {

    @Container
    @ServiceConnection
    static ElasticsearchContainer elasticsearch =
            new ElasticsearchContainer("docker.elastic.co/elasticsearch/elasticsearch:8.15.0")
                    .withEnv("xpack.security.enabled", "false");

    @Autowired
    BookRepository bookRepository;

    @Autowired
    BookSearchQueryService searchQueryService;

    @Autowired
    ElasticsearchOperations elasticsearchOperations;

    @BeforeEach
    void freshIndex() {
        var indexOps = elasticsearchOperations.indexOps(BookDocument.class);
        if (indexOps.exists()) {
            indexOps.delete();
        }
        indexOps.create();
        indexOps.putMapping(indexOps.createMapping(BookDocument.class));
    }

    private Book saveBook(String title, String author, String category) {
        return bookRepository.save(Book.builder()
                .title(title).author(author).isbn(UUID.randomUUID().toString())
                .totalCopies(3).availableCopies(2).purchasePrice(BigDecimal.TEN)
                .category(category).build());
    }

    @Test
    void searchFindsByTitleAndFiltersByCategory() {
        Book alchemist = saveBook("The Alchemist", "Paulo Coelho", "Fiction");
        Book cookbook = saveBook("The Joy of Cooking", "Irma Rombauer", "Cooking");
        elasticsearchOperations.save(BookDocument.from(alchemist));
        elasticsearchOperations.save(BookDocument.from(cookbook));
        elasticsearchOperations.indexOps(BookDocument.class).refresh();

        // Elasticsearch's default refresh interval means a just-written
        // document isn't always immediately searchable; the explicit
        // refresh() above should cover it, but await() guards against any
        // residual timing flakiness rather than a single point-in-time assert.
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            var byTitle = searchQueryService.search("alchemist", null, null, null, 0, 20);
            assertThat(byTitle.content()).extracting("title").containsExactly("The Alchemist");
        });

        var byCategory = searchQueryService.search(null, "Cooking", null, null, 0, 20);
        assertThat(byCategory.content()).extracting("title").containsExactly("The Joy of Cooking");
    }
}
