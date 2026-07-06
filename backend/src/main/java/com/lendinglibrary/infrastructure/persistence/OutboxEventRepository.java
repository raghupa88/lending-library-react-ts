package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query("select e from OutboxEvent e where e.publishedAt is null order by e.createdAt asc")
    List<OutboxEvent> findUnpublishedBatch(org.springframework.data.domain.Pageable pageable);
}
