package com.lendinglibrary.api.dto;

import java.util.List;
import java.util.UUID;

public record CourseProgressResponse(
        UUID courseId,
        long totalLessons,
        long completedLessons,
        List<UUID> completedLessonIds,
        UUID nextLessonId
) {}
