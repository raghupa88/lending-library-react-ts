package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.BatchSession;

import java.time.LocalDate;
import java.util.UUID;

public record SessionResponse(UUID id, LocalDate sessionDate, String topic) {
    public static SessionResponse from(BatchSession s) {
        return new SessionResponse(s.getId(), s.getSessionDate(), s.getTopic());
    }
}
