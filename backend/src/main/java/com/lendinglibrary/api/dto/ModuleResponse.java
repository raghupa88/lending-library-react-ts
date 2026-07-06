package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.CourseModule;

import java.util.List;
import java.util.UUID;

public record ModuleResponse(
        UUID id,
        String title,
        int sortOrder,
        List<LessonResponse> lessons
) {
    public static ModuleResponse from(CourseModule m, List<LessonResponse> lessons) {
        return new ModuleResponse(m.getId(), m.getTitle(), m.getSortOrder(), lessons);
    }
}
