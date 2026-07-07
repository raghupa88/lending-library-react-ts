package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.LearnTest;

import java.util.UUID;

public record AdminTestSummaryResponse(
        UUID id, String title, int passPercent, int timeLimitMin, int attemptsAllowed, int questionCount
) {
    public static AdminTestSummaryResponse from(LearnTest t, int questionCount) {
        return new AdminTestSummaryResponse(
                t.getId(), t.getTitle(), t.getPassPercent(), t.getTimeLimitMin(), t.getAttemptsAllowed(), questionCount);
    }
}
