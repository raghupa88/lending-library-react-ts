package com.lendinglibrary.api.dto;

import java.math.BigDecimal;

public record CourseRevenueResponse(String courseTitle, BigDecimal revenue) {
}
