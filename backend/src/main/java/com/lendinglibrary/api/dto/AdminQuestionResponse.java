package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Question;

import java.util.List;
import java.util.UUID;

public record AdminQuestionResponse(
        UUID id, String prompt, String kind, int sortOrder, List<AdminOptionResponse> options
) {
    public static AdminQuestionResponse from(Question q, List<AdminOptionResponse> options) {
        return new AdminQuestionResponse(q.getId(), q.getPrompt(), q.getKind().name(), q.getSortOrder(), options);
    }
}
