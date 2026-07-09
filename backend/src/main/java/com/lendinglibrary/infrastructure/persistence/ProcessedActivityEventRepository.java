package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.ProcessedActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedActivityEventRepository extends JpaRepository<ProcessedActivityEvent, UUID> {
}
