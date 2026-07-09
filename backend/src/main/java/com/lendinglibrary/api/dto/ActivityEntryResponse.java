package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.ActivityEntry;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

public record ActivityEntryResponse(
        UUID eventId,
        String type,
        String summary,
        LocalDateTime occurredAt
) {
    public static ActivityEntryResponse from(ActivityEntry entry) {
        return new ActivityEntryResponse(
                entry.getKey().getEventId(),
                entry.getType(),
                entry.getSummary(),
                LocalDateTime.ofInstant(entry.getKey().getOccurredAt(), ZoneId.systemDefault()));
    }
}
