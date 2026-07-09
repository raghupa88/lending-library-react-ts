package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.ActivityEntry;
import com.lendinglibrary.domain.entity.ActivityEntryKey;
import org.springframework.data.cassandra.repository.CassandraRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends CassandraRepository<ActivityEntry, ActivityEntryKey> {

    /** Clustering order on the table is already occurred_at DESC — no ORDER BY needed. */
    List<ActivityEntry> findFirst30ByKeyUserId(UUID userId);
}
