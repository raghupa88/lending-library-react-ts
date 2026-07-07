package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Batch;
import com.lendinglibrary.domain.entity.BatchSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BatchSessionRepository extends JpaRepository<BatchSession, UUID> {
    List<BatchSession> findByBatchOrderBySessionDateAsc(Batch batch);
}
