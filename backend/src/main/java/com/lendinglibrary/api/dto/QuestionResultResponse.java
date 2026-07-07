package com.lendinglibrary.api.dto;

import java.util.List;
import java.util.UUID;

/** Post-submission per-question review — the answer key is safe to reveal here. */
public record QuestionResultResponse(
        UUID questionId, boolean correct, List<UUID> correctOptionIds, List<UUID> selectedOptionIds
) {}
