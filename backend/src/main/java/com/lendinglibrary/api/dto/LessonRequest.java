package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.enums.LessonKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LessonRequest(
        @NotBlank String title,
        @NotNull LessonKind kind,
        String contentUrl,
        String body,
        Integer estMinutes
) {}
