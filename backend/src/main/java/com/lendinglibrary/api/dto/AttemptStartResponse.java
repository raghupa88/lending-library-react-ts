package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Attempt;

import java.time.LocalDateTime;
import java.util.UUID;

public record AttemptStartResponse(UUID attemptId, UUID testId, LocalDateTime startedAt, int timeLimitMin) {
    public static AttemptStartResponse from(Attempt a, int timeLimitMin) {
        return new AttemptStartResponse(a.getId(), a.getTest().getId(), a.getStartedAt(), timeLimitMin);
    }
}
