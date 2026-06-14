package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Loan;

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
        String status
) {
    public static LoanResponse from(Loan l) {
        return new LoanResponse(
                l.getId(),
                l.getBook().getId(),
                l.getBook().getTitle(),
                l.getBook().getAuthor(),
                l.getBook().getCoverUrl(),
                l.getBorrowedAt(),
                l.getDueDate(),
                l.getReturnedAt(),
                l.getStatus().name()
        );
    }
}
