package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Course;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CourseDetailResponse(
        UUID id,
        String slug,
        String title,
        String track,
        String level,
        String language,
        String summary,
        BigDecimal price,
        String status,
        List<ModuleResponse> modules
) {
    public static CourseDetailResponse from(Course c, List<ModuleResponse> modules) {
        return new CourseDetailResponse(
                c.getId(), c.getSlug(), c.getTitle(), c.getTrack().name(), c.getLevel().name(),
                c.getLanguage(), c.getSummary(), c.getPrice(), c.getStatus().name(), modules
        );
    }
}
