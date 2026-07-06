package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Course;

import java.math.BigDecimal;
import java.util.UUID;

public record CourseSummaryResponse(
        UUID id,
        String slug,
        String title,
        String track,
        String level,
        String language,
        String summary,
        BigDecimal price,
        String status,
        int moduleCount,
        long lessonCount
) {
    public static CourseSummaryResponse from(Course c, int moduleCount, long lessonCount) {
        return new CourseSummaryResponse(
                c.getId(), c.getSlug(), c.getTitle(), c.getTrack().name(), c.getLevel().name(),
                c.getLanguage(), c.getSummary(), c.getPrice(), c.getStatus().name(),
                moduleCount, lessonCount
        );
    }
}
