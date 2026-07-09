package com.lendinglibrary.infrastructure.search;

import com.lendinglibrary.domain.entity.BookDocument;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.stereotype.Component;

/**
 * Creates the {@code books} index (and its mapping) on startup if it
 * doesn't already exist. Elasticsearch has no Flyway/CQL-style migration
 * tool in this stack, so "create the index from the annotated document if
 * missing" is the idiomatic equivalent here — see ADR-026.
 */
@Component
@Profile("elasticsearch")
@RequiredArgsConstructor
public class BookSearchIndexInitializer implements ApplicationRunner {

    private final ElasticsearchOperations elasticsearchOperations;

    @Override
    public void run(ApplicationArguments args) {
        IndexOperations indexOps = elasticsearchOperations.indexOps(BookDocument.class);
        if (!indexOps.exists()) {
            indexOps.create();
            indexOps.putMapping(indexOps.createMapping(BookDocument.class));
        }
    }
}
