package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.LoanResponse;
import com.lendinglibrary.api.dto.ReservationResponse;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.Loan;
import com.lendinglibrary.domain.entity.Reservation;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.LoanStatus;
import com.lendinglibrary.domain.enums.ReservationStatus;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.LoanRepository;
import com.lendinglibrary.infrastructure.persistence.ReservationRepository;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Reservations are a real hold, not just a notification: when a copy comes
 * back and someone's waiting, it's taken out of the general pool and held
 * for the front of the queue for a fixed window (see
 * docs/adr/ADR-016-book-reservations.md) — a bare "it's back!" notice would
 * let anyone else borrow it first and defeat the point of waiting in line.
 */
@Service
@RequiredArgsConstructor
public class ReservationService {

    private static final int CLAIM_LOAN_DAYS = 14;

    private final ReservationRepository reservationRepository;
    private final LoanRepository loanRepository;
    private final BookService bookService;
    private final UserService userService;
    private final SubscriptionRepository subscriptionRepository;
    private final DomainEventPublisher events;

    @Value("${reservations.hold-hours:72}")
    private int holdHours;

    @Transactional
    public ReservationResponse join(UUID bookId, String email) {
        Book book = bookService.findOrThrow(bookId);
        if (book.getAvailableCopies() > 0) {
            throw new BusinessException(
                    "Copies of \"" + book.getTitle() + "\" are available — borrow it directly instead of waiting");
        }

        User user = userService.findByEmail(email);
        boolean alreadyActive = !reservationRepository.findByUserAndBookAndStatusIn(
                user, book, List.of(ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP)).isEmpty();
        if (alreadyActive) {
            throw new BusinessException("You're already on the waitlist for this book");
        }

        Reservation reservation = reservationRepository.save(Reservation.builder()
                .book(book).user(user).status(ReservationStatus.WAITING).reservedAt(LocalDateTime.now()).build());

        return ReservationResponse.from(reservation);
    }

    @Transactional
    public void cancel(UUID reservationId, String email) {
        Reservation reservation = findOwnedOrThrow(reservationId, email);
        if (reservation.getStatus() == ReservationStatus.CANCELLED
                || reservation.getStatus() == ReservationStatus.FULFILLED
                || reservation.getStatus() == ReservationStatus.EXPIRED) {
            throw new BusinessException("This reservation is no longer active");
        }

        boolean hadHold = reservation.getStatus() == ReservationStatus.READY_FOR_PICKUP;
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        if (hadHold) {
            releaseHoldAndPromoteNext(reservation.getBook());
        }
    }

    @Transactional
    public LoanResponse claim(UUID reservationId, String email) {
        Reservation reservation = findOwnedOrThrow(reservationId, email);
        if (reservation.getStatus() != ReservationStatus.READY_FOR_PICKUP) {
            throw new BusinessException("This reservation isn't ready for pickup yet");
        }
        if (reservation.getHoldExpiresAt() != null && reservation.getHoldExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Your hold on this book has expired");
        }

        User user = reservation.getUser();
        var sub = subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE);
        int maxLoans = sub.map(Subscription::getMaxConcurrentLoans).orElse(3);
        long activeLoans = loanRepository.countByUserAndStatus(user, LoanStatus.ACTIVE);
        if (activeLoans >= maxLoans) {
            throw new BusinessException(
                    "Loan limit reached (" + maxLoans + " books). Return a book to claim this hold.");
        }

        // The copy behind this hold already left the general pool when the
        // hold was created (promoteNextWaiting, below) — claiming just
        // records the loan, it doesn't touch availableCopies again.
        Loan loan = Loan.builder()
                .user(user).book(reservation.getBook())
                .borrowedAt(LocalDateTime.now())
                .dueDate(LocalDateTime.now().plusDays(CLAIM_LOAN_DAYS))
                .status(LoanStatus.ACTIVE)
                .build();
        loan = loanRepository.save(loan);

        reservation.setStatus(ReservationStatus.FULFILLED);
        reservationRepository.save(reservation);

        events.publish(Topics.LOAN_EVENTS, "loan.created", loan.getId().toString(), Map.of(
                "userId", user.getId().toString(),
                "userEmail", user.getEmail(),
                "bookId", reservation.getBook().getId().toString(),
                "bookTitle", reservation.getBook().getTitle(),
                "dueDate", loan.getDueDate().toString()
        ));

        return LoanResponse.from(loan);
    }

    public List<ReservationResponse> myReservations(String email) {
        User user = userService.findByEmail(email);
        return reservationRepository.findByUserOrderByReservedAtDesc(user).stream()
                .map(ReservationResponse::from).toList();
    }

    /** Used by LoanService to block a renewal when someone's queued for this book. */
    public boolean hasActiveQueue(Book book) {
        return reservationRepository.existsByBookAndStatusIn(
                book, List.of(ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP));
    }

    /** Called by LoanService.returnBook once it has already put the returned copy back in the pool. */
    @Transactional
    public void promoteNextWaiting(Book book) {
        List<Reservation> waiting = reservationRepository
                .findByBookAndStatusOrderByReservedAtAsc(book, ReservationStatus.WAITING);
        if (waiting.isEmpty()) return;

        Reservation next = waiting.get(0);
        book.setAvailableCopies(book.getAvailableCopies() - 1);
        next.setStatus(ReservationStatus.READY_FOR_PICKUP);
        next.setHoldExpiresAt(LocalDateTime.now().plusHours(holdHours));
        reservationRepository.save(next);

        events.publish(Topics.BOOK_EVENTS, "reservation.ready", next.getId().toString(), Map.of(
                "userId", next.getUser().getId().toString(),
                "userEmail", next.getUser().getEmail(),
                "bookId", book.getId().toString(),
                "bookTitle", book.getTitle(),
                "holdExpiresAt", next.getHoldExpiresAt().toString()
        ));
    }

    private void releaseHoldAndPromoteNext(Book book) {
        book.setAvailableCopies(book.getAvailableCopies() + 1);
        promoteNextWaiting(book);
    }

    @Scheduled(fixedDelayString = "${reservations.expiry-sweep-interval-ms:3600000}")
    @Transactional
    public void expireStaleHolds() {
        List<Reservation> expired = reservationRepository
                .findByStatusAndHoldExpiresAtBefore(ReservationStatus.READY_FOR_PICKUP, LocalDateTime.now());
        for (Reservation reservation : expired) {
            reservation.setStatus(ReservationStatus.EXPIRED);
            reservationRepository.save(reservation);
            releaseHoldAndPromoteNext(reservation.getBook());
        }
    }

    private Reservation findOwnedOrThrow(UUID reservationId, String email) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));
        if (!reservation.getUser().getEmail().equals(email)) {
            throw new BusinessException("This reservation doesn't belong to the current user");
        }
        return reservation;
    }
}
