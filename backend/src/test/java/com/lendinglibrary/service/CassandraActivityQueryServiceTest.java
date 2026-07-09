package com.lendinglibrary.service;

import com.lendinglibrary.application.service.CassandraActivityQueryService;
import com.lendinglibrary.domain.entity.ActivityEntry;
import com.lendinglibrary.domain.entity.ActivityEntryKey;
import com.lendinglibrary.infrastructure.persistence.ActivityRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CassandraActivityQueryServiceTest {

    @Mock ActivityRepository activityRepository;

    @Test
    void recentFor_mapsEntriesToResponses() {
        UUID userId = UUID.randomUUID();
        ActivityEntry entry = ActivityEntry.builder()
                .key(ActivityEntryKey.builder().userId(userId).occurredAt(Instant.now()).eventId(UUID.randomUUID()).build())
                .type("loan.created")
                .summary("Borrowed \"The Alchemist\"")
                .build();
        when(activityRepository.findFirst30ByKeyUserId(userId)).thenReturn(List.of(entry));

        var service = new CassandraActivityQueryService(activityRepository);
        var result = service.recentFor(userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo("loan.created");
        assertThat(result.get(0).summary()).isEqualTo("Borrowed \"The Alchemist\"");
    }
}
