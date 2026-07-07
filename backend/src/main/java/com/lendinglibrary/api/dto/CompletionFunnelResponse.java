package com.lendinglibrary.api.dto;

public record CompletionFunnelResponse(long enrolled, long startedLesson, long completedAllLessons, long certified) {
}
