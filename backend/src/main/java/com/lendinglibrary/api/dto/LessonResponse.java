package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Lesson;

import java.util.UUID;

public record LessonResponse(
        UUID id,
        String title,
        String kind,
        String contentUrl,
        String body,
        Integer estMinutes,
        int sortOrder
) {
    public static LessonResponse from(Lesson l) {
        return new LessonResponse(
                l.getId(), l.getTitle(), l.getKind().name(), l.getContentUrl(),
                l.getBody(), l.getEstMinutes(), l.getSortOrder()
        );
    }
}
