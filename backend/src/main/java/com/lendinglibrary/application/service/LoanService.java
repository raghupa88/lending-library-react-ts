package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.LoanRequest;
import com.lendinglibrary.api.dto.LoanResponse;
import com.lendinglibrary.domain.entity.Loan;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.LoanStatus;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.LoanRepository;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoanService {

    private static final int RENEWAL_EXTENSION_DAYS = 14;

    private final LoanRepository loanRepository;
    private final BookService bookService;
    private final UserService userService;
    private final SubscriptionRepository subscriptionRepository;
    private final DomainEventPublisher events;
    private final ReservationService reservationService;

    public List<LoanResponse> getUserLoans(String email) {
        User user = userService.findByEmail(email);
        return loanRepository.findByUser(user).stream().map(LoanResponse::from).toList();
    }

    @Transactional
    public LoanResponse borrow(LoanRequest req, String email) {
        User user = userService.findByEmail(email);
        var book = bookService.findOrThrow(req.bookId());

        if (book.getAvailableCopies() <= 0) {
            throw new BusinessException("No copies available for: " + book.getTitle());
        }

        var sub = subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE);
        int maxLoans = sub.map(s -> s.getMaxConcurrentLoans()).orElse(3);
        long activeLoans = loanRepository.countByUserAndStatus(user, LoanStatus.ACTIVE);

        if (activeLoans >= maxLoans) {
            throw new BusinessException(
                    "Loan limit reached (" + maxLoans + " books). Return a book to borrow more.");
        }

        book.setAvailableCopies(book.getAvailableCopies() - 1);
        // book is managed entity; changes persist automatically within transaction

        Loan loan = Loan.builder()
                .user(user).book(book)
                .borrowedAt(LocalDateTime.now())
                .dueDate(LocalDateTime.now().plusDays(req.daysToKeep()))
                .status(LoanStatus.ACTIVE)
                .build();
        loan = loanRepository.save(loan);

        events.publish(Topics.LOAN_EVENTS, "loan.created", loan.getId().toString(), Map.of(
                "userId", user.getId().toString(),
                "userEmail", user.getEmail(),
                "bookId", book.getId().toString(),
                "bookTitle", book.getTitle(),
                "dueDate", loan.getDueDate().toString()
        ));

        return LoanResponse.from(loan);
    }

    @Transactional
    public LoanResponse returnBook(UUID loanId, String email) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        if (!loan.getUser().getEmail().equals(email)) {
            throw new BusinessException("This loan does not belong to the current user");
        }
        if (loan.getStatus() == LoanStatus.RETURNED) {
            throw new BusinessException("Book already returned");
        }

        loan.setStatus(LoanStatus.RETURNED);
        loan.setReturnedAt(LocalDateTime.now());
        loan.getBook().setAvailableCopies(loan.getBook().getAvailableCopies() + 1);
        loan = loanRepository.save(loan);

        events.publish(Topics.LOAN_EVENTS, "loan.returned", loan.getId().toString(), Map.of(
                "userId", loan.getUser().getId().toString(),
                "userEmail", loan.getUser().getEmail(),
                "bookId", loan.getBook().getId().toString(),
                "bookTitle", loan.getBook().getTitle()
        ));

        // If anyone's waiting for this book, the returned copy goes straight
        // to them as a held reservation rather than back into general
        // circulation — see ReservationService for why.
        reservationService.promoteNextWaiting(loan.getBook());

        return LoanResponse.from(loan);
    }

    @Transactional
    public LoanResponse renew(UUID loanId, String email) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        if (!loan.getUser().getEmail().equals(email)) {
            throw new BusinessException("This loan does not belong to the current user");
        }
        if (loan.getStatus() != LoanStatus.ACTIVE) {
            throw new BusinessException("Only active loans can be renewed");
        }
        if (loan.isRenewed()) {
            throw new BusinessException("This book has already been renewed once");
        }
        // A waiting reservation means someone's queued for this exact copy —
        // letting it stay checked out longer would stall their turn.
        if (reservationService.hasActiveQueue(loan.getBook())) {
            throw new BusinessException("Can't renew — someone else is waiting for this book");
        }

        LocalDateTime base = loan.getDueDate().isBefore(LocalDateTime.now())
                ? LocalDateTime.now() : loan.getDueDate();
        loan.setDueDate(base.plusDays(RENEWAL_EXTENSION_DAYS));
        loan.setRenewed(true);
        loan = loanRepository.save(loan);

        events.publish(Topics.LOAN_EVENTS, "loan.renewed", loan.getId().toString(), Map.of(
                "userId", loan.getUser().getId().toString(),
                "userEmail", loan.getUser().getEmail(),
                "bookId", loan.getBook().getId().toString(),
                "bookTitle", loan.getBook().getTitle(),
                "dueDate", loan.getDueDate().toString()
        ));

        return LoanResponse.from(loan);
    }
}
