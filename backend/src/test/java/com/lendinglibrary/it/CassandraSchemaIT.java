package com.lendinglibrary.it;

import com.lendinglibrary.domain.entity.ActivityEntry;
import com.lendinglibrary.domain.entity.ActivityEntryKey;
import com.lendinglibrary.domain.entity.BookBorrowCount;
import com.lendinglibrary.infrastructure.persistence.ActivityRepository;
import com.lendinglibrary.infrastructure.persistence.BookBorrowCountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.CassandraContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves cql/schema.cql and the Spring Data Cassandra entity mappings
 * actually work against a real engine — the same job FlywayMigrationIT
 * does for Postgres. `withInitScript` runs schema.cql (keyspace + both
 * tables) before the Spring context connects, mirroring what the
 * `cassandra-init` compose service does against a real cluster (ADR-025).
 */
@SpringBootTest
@ActiveProfiles("cassandra")
@Testcontainers
class CassandraSchemaIT {

    @Container
    @ServiceConnection
    static CassandraContainer<?> cassandra = new CassandraContainer<>("cassandra:5")
            .withInitScript("cql/schema.cql");

    @Autowired
    ActivityRepository activityRepository;

    @Autowired
    BookBorrowCountRepository bookBorrowCountRepository;

    @Test
    void activityEntryRoundTripsAndOrdersNewestFirst() {
        UUID userId = UUID.randomUUID();
        Instant older = Instant.now().minusSeconds(60);
        Instant newer = Instant.now();

        activityRepository.save(ActivityEntry.builder()
                .key(ActivityEntryKey.builder().userId(userId).occurredAt(older).eventId(UUID.randomUUID()).build())
                .type("loan.created").summary("Borrowed \"Older Book\"").build());
        activityRepository.save(ActivityEntry.builder()
                .key(ActivityEntryKey.builder().userId(userId).occurredAt(newer).eventId(UUID.randomUUID()).build())
                .type("loan.created").summary("Borrowed \"Newer Book\"").build());

        var result = activityRepository.findFirst30ByKeyUserId(userId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSummary()).contains("Newer Book");
        assertThat(result.get(1).getSummary()).contains("Older Book");
    }

    @Test
    void bookBorrowCountIncrementsAcrossMultipleCalls() {
        UUID bookId = UUID.randomUUID();

        bookBorrowCountRepository.increment(bookId);
        bookBorrowCountRepository.increment(bookId);
        bookBorrowCountRepository.increment(bookId);

        BookBorrowCount count = bookBorrowCountRepository.findById(bookId).orElseThrow();
        assertThat(count.getBorrowCount()).isEqualTo(3);
    }
}
