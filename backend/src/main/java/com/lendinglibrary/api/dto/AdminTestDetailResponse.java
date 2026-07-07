package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.LearnTest;

import java.util.List;
import java.util.UUID;

public record AdminTestDetailResponse(
        UUID id, String title, int passPercent, int timeLimitMin, int attemptsAllowed,
        List<AdminQuestionResponse> questions
) {
    public static AdminTestDetailResponse from(LearnTest t, List<AdminQuestionResponse> questions) {
        return new AdminTestDetailResponse(
                t.getId(), t.getTitle(), t.getPassPercent(), t.getTimeLimitMin(), t.getAttemptsAllowed(), questions);
    }
}
