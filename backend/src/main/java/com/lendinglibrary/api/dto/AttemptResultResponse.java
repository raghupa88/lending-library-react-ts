package com.lendinglibrary.api.dto;

import java.util.List;
import java.util.UUID;

public record AttemptResultResponse(
        UUID attemptId, int scorePercent, boolean passed, int attemptsUsed, int attemptsAllowed,
        boolean certificateIssued, String certificateSerial, List<QuestionResultResponse> questionResults
) {}
