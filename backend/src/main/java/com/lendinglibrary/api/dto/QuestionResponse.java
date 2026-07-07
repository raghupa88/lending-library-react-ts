package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Question;

import java.util.List;
import java.util.UUID;

public record QuestionResponse(UUID id, String prompt, String kind, int sortOrder, List<OptionResponse> options) {
    public static QuestionResponse from(Question q, List<OptionResponse> options) {
        return new QuestionResponse(q.getId(), q.getPrompt(), q.getKind().name(), q.getSortOrder(), options);
    }
}
