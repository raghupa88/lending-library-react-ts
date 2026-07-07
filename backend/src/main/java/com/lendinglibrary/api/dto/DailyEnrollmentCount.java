package com.lendinglibrary.api.dto;

import java.time.LocalDate;

public record DailyEnrollmentCount(LocalDate date, long count) {
}
