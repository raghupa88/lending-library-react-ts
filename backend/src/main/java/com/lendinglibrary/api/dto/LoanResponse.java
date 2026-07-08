package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Loan;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record LoanResponse(
        UUID id,
        UUID bookId,
        String bookTitle,
        String bookAuthor,
        String bookCover,
        LocalDateTime borrowedAt,
        LocalDateTime dueDate,
        LocalDateTime returnedAt,
        String status,
        boolean renewed,
        UUID lateFeeOrderId,
        BigDecimal lateFeeAmount
) {
    public static LoanResponse from(Loan l) {
        return from(l, null, null);
    }

    /** lateFeeOrderId/lateFeeAmount are only non-null right after a return that incurred a fee. */
    public static LoanResponse from(Loan l, UUID lateFeeOrderId, BigDecimal lateFeeAmount) {
        return new LoanResponse(
                l.getId(),
                l.getBook().getId(),
                l.getBook().getTitle(),
                l.getBook().getAuthor(),
                l.getBook().getCoverUrl(),
                l.getBorrowedAt(),
                l.getDueDate(),
                l.getReturnedAt(),
                l.getStatus().name(),
                l.isRenewed(),
                lateFeeOrderId,
                lateFeeAmount
        );
    }
}
