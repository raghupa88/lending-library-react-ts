package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.QuestionOption;

import java.util.UUID;

public record AdminOptionResponse(UUID id, String label, boolean correct, int sortOrder) {
    public static AdminOptionResponse from(QuestionOption o) {
        return new AdminOptionResponse(o.getId(), o.getLabel(), o.isCorrect(), o.getSortOrder());
    }
}
