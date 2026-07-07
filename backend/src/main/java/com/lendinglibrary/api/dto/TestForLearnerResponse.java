package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.LearnTest;

import java.util.List;
import java.util.UUID;

/** Full test content for taking it — questions/options, never the answer key. */
public record TestForLearnerResponse(
        UUID id, String title, int passPercent, int timeLimitMin, int attemptsAllowed,
        int attemptsUsed, List<QuestionResponse> questions
) {
    public static TestForLearnerResponse from(LearnTest t, int attemptsUsed, List<QuestionResponse> questions) {
        return new TestForLearnerResponse(
                t.getId(), t.getTitle(), t.getPassPercent(), t.getTimeLimitMin(), t.getAttemptsAllowed(),
                attemptsUsed, questions
        );
    }
}
