package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.QuestionOption;

import java.util.UUID;

/** Learner-facing — deliberately omits {@code correct} so taking a test can't leak the answer key. */
public record OptionResponse(UUID id, String label, int sortOrder) {
    public static OptionResponse from(QuestionOption o) {
        return new OptionResponse(o.getId(), o.getLabel(), o.getSortOrder());
    }
}
