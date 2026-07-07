package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.LearnTest;

import java.util.UUID;

/** One row in an enrolled learner's "tests for this course" list — no questions, just status. */
public record TestListItemResponse(
        UUID id, String title, int passPercent, int timeLimitMin, int attemptsAllowed,
        int attemptsUsed, Integer bestScorePercent, boolean passed
) {
    public static TestListItemResponse from(
            LearnTest t, int attemptsUsed, Integer bestScorePercent, boolean passed) {
        return new TestListItemResponse(
                t.getId(), t.getTitle(), t.getPassPercent(), t.getTimeLimitMin(), t.getAttemptsAllowed(),
                attemptsUsed, bestScorePercent, passed
        );
    }
}
