package com.lendinglibrary.service;

import com.lendinglibrary.application.service.BookService;
import com.lendinglibrary.application.service.ReservationService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.Reservation;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.LoanStatus;
import com.lendinglibrary.domain.enums.ReservationStatus;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.LoanRepository;
import com.lendinglibrary.infrastructure.persistence.ReservationRepository;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock ReservationRepository reservationRepository;
    @Mock LoanRepository loanRepository;
    @Mock BookService bookService;
    @Mock UserService userService;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock DomainEventPublisher events;
    @InjectMocks ReservationService reservationService;

    private User user;
    private Book book;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(reservationService, "holdHours", 72);

        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        book = Book.builder().id(UUID.randomUUID()).title("Scarce Book").author("Author")
                .availableCopies(0).totalCopies(1).purchasePrice(BigDecimal.TEN).build();
    }

    @Test
    void join_success_whenNoCopiesAvailable() {
        when(bookService.findOrThrow(book.getId())).thenReturn(book);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(reservationRepository.findByUserAndBookAndStatusIn(user, book,
                List.of(ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP))).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = reservationService.join(book.getId(), "member@example.com");

        assertThat(result.status()).isEqualTo("WAITING");
    }

    @Test
    void join_copiesAvailable_throws() {
        book.setAvailableCopies(2);
        when(bookService.findOrThrow(book.getId())).thenReturn(book);

        assertThatThrownBy(() -> reservationService.join(book.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("available");
    }

    @Test
    void join_alreadyOnWaitlist_throws() {
        Reservation existing = Reservation.builder().book(book).user(user).status(ReservationStatus.WAITING).build();
        when(bookService.findOrThrow(book.getId())).thenReturn(book);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(reservationRepository.findByUserAndBookAndStatusIn(user, book,
                List.of(ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP)))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> reservationService.join(book.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already on the waitlist");
    }

    @Test
    void cancel_waiting_doesNotTouchStock() {
        UUID id = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(id).book(book).user(user)
                .status(ReservationStatus.WAITING).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));

        reservationService.cancel(id, "member@example.com");

        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(book.getAvailableCopies()).isZero();
        verify(reservationRepository, never()).findByBookAndStatusOrderByReservedAtAsc(any(), any());
    }

    @Test
    void cancel_readyForPickup_releasesHoldAndPromotesNext() {
        UUID id = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(id).book(book).user(user)
                .status(ReservationStatus.READY_FOR_PICKUP).holdExpiresAt(LocalDateTime.now().plusHours(1)).build();
        User nextUser = User.builder().id(UUID.randomUUID()).email("next@example.com").role(Role.MEMBER).build();
        Reservation next = Reservation.builder().id(UUID.randomUUID()).book(book).user(nextUser)
                .status(ReservationStatus.WAITING).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));
        when(reservationRepository.findByBookAndStatusOrderByReservedAtAsc(book, ReservationStatus.WAITING))
                .thenReturn(List.of(next));

        reservationService.cancel(id, "member@example.com");

        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        // released back to the pool (+1) then immediately re-held for the next in line (-1)
        assertThat(book.getAvailableCopies()).isZero();
        assertThat(next.getStatus()).isEqualTo(ReservationStatus.READY_FOR_PICKUP);
        assertThat(next.getHoldExpiresAt()).isNotNull();
        verify(events).publish(eq(Topics.BOOK_EVENTS), eq("reservation.ready"), any(), any(Map.class));
    }

    @Test
    void cancel_wrongUser_throws() {
        UUID id = UUID.randomUUID();
        User otherUser = User.builder().id(UUID.randomUUID()).email("other@example.com").role(Role.MEMBER).build();
        Reservation reservation = Reservation.builder().id(id).book(book).user(otherUser)
                .status(ReservationStatus.WAITING).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reservationService.cancel(id, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("doesn't belong");
    }

    @Test
    void cancel_alreadyCancelled_throws() {
        UUID id = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(id).book(book).user(user)
                .status(ReservationStatus.CANCELLED).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reservationService.cancel(id, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no longer active");
    }

    @Test
    void claim_success_createsLoanWithoutTouchingStock() {
        UUID id = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(id).book(book).user(user)
                .status(ReservationStatus.READY_FOR_PICKUP).holdExpiresAt(LocalDateTime.now().plusHours(1)).build();
        Subscription sub = Subscription.builder().user(user).plan(SubscriptionPlan.BASIC)
                .monthlyPrice(new BigDecimal("199.00")).startDate(LocalDateTime.now())
                .status(SubscriptionStatus.ACTIVE).maxConcurrentLoans(3).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE)).thenReturn(Optional.of(sub));
        when(loanRepository.countByUserAndStatus(user, LoanStatus.ACTIVE)).thenReturn(0L);
        when(loanRepository.save(any())).thenAnswer(inv -> {
            com.lendinglibrary.domain.entity.Loan l = inv.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        var result = reservationService.claim(id, "member@example.com");

        assertThat(result.status()).isEqualTo("ACTIVE");
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.FULFILLED);
        assertThat(book.getAvailableCopies()).isZero();
        verify(events).publish(eq(Topics.LOAN_EVENTS), eq("loan.created"), any(), any(Map.class));
    }

    @Test
    void claim_notReadyForPickup_throws() {
        UUID id = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(id).book(book).user(user)
                .status(ReservationStatus.WAITING).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reservationService.claim(id, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("isn't ready");
    }

    @Test
    void claim_expiredHold_throws() {
        UUID id = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(id).book(book).user(user)
                .status(ReservationStatus.READY_FOR_PICKUP).holdExpiresAt(LocalDateTime.now().minusMinutes(1)).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reservationService.claim(id, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void claim_loanLimitReached_throws() {
        UUID id = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(id).book(book).user(user)
                .status(ReservationStatus.READY_FOR_PICKUP).holdExpiresAt(LocalDateTime.now().plusHours(1)).build();
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE)).thenReturn(Optional.empty());
        when(loanRepository.countByUserAndStatus(user, LoanStatus.ACTIVE)).thenReturn(3L);

        assertThatThrownBy(() -> reservationService.claim(id, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Loan limit reached");
    }

    @Test
    void hasActiveQueue_true_whenWaitingOrReadyReservationsExist() {
        when(reservationRepository.existsByBookAndStatusIn(book,
                List.of(ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP))).thenReturn(true);

        assertThat(reservationService.hasActiveQueue(book)).isTrue();
    }

    @Test
    void hasActiveQueue_false_whenNoneActive() {
        when(reservationRepository.existsByBookAndStatusIn(book,
                List.of(ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP))).thenReturn(false);

        assertThat(reservationService.hasActiveQueue(book)).isFalse();
    }

    @Test
    void promoteNextWaiting_noOneWaiting_isANoOp() {
        when(reservationRepository.findByBookAndStatusOrderByReservedAtAsc(book, ReservationStatus.WAITING))
                .thenReturn(List.of());

        reservationService.promoteNextWaiting(book);

        verify(events, never()).publish(any(), any(), any(), any());
    }

    @Test
    void expireStaleHolds_releasesAndPromotesNext() {
        Reservation expired = Reservation.builder().id(UUID.randomUUID()).book(book).user(user)
                .status(ReservationStatus.READY_FOR_PICKUP).holdExpiresAt(LocalDateTime.now().minusMinutes(1)).build();
        when(reservationRepository.findByStatusAndHoldExpiresAtBefore(eq(ReservationStatus.READY_FOR_PICKUP), any()))
                .thenReturn(List.of(expired));
        when(reservationRepository.findByBookAndStatusOrderByReservedAtAsc(book, ReservationStatus.WAITING))
                .thenReturn(List.of());

        reservationService.expireStaleHolds();

        assertThat(expired.getStatus()).isEqualTo(ReservationStatus.EXPIRED);
        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }
}
