package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Loan;
import com.lendinglibrary.domain.enums.LoanStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminLoanResponse(
        UUID id,
        UUID bookId,
        String bookTitle,
        String memberName,
        String memberEmail,
        LocalDateTime borrowedAt,
        LocalDateTime dueDate,
        LocalDateTime returnedAt,
        String status
) {
    public static AdminLoanResponse from(Loan l) {
        // ACTIVE loans past their due date surface as OVERDUE without a
        // separate status-update job.
        String status = l.getStatus().name();
        if (l.getStatus() == LoanStatus.ACTIVE && l.getDueDate().isBefore(LocalDateTime.now())) {
            status = LoanStatus.OVERDUE.name();
        }
        return new AdminLoanResponse(
                l.getId(),
                l.getBook().getId(),
                l.getBook().getTitle(),
                l.getUser().getFirstName() + " " + l.getUser().getLastName(),
                l.getUser().getEmail(),
                l.getBorrowedAt(),
                l.getDueDate(),
                l.getReturnedAt(),
                status
        );
    }
}
