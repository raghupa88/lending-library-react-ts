package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.LoanRequest;
import com.lendinglibrary.application.service.BookService;
import com.lendinglibrary.application.service.LoanService;
import com.lendinglibrary.application.service.ReservationService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.Loan;
import com.lendinglibrary.domain.entity.Subscription;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.LoanStatus;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.enums.SubscriptionPlan;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.LoanRepository;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    @Mock LoanRepository loanRepository;
    @Mock BookService bookService;
    @Mock UserService userService;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock DomainEventPublisher events;
    @Mock ReservationService reservationService;
    @InjectMocks LoanService loanService;

    private User user;
    private Book book;
    private Subscription basicSub;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com")
                .role(Role.MEMBER).build();

        book = Book.builder().id(UUID.randomUUID()).title("Test Book")
                .author("Author").availableCopies(2).totalCopies(3)
                .purchasePrice(BigDecimal.TEN).build();

        basicSub = Subscription.builder().user(user).plan(SubscriptionPlan.BASIC)
                .monthlyPrice(new BigDecimal("199.00")).startDate(LocalDateTime.now())
                .status(SubscriptionStatus.ACTIVE).maxConcurrentLoans(3).build();
    }

    @Test
    void borrow_success() {
        var req = new LoanRequest(book.getId(), 14);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(bookService.findOrThrow(book.getId())).thenReturn(book);
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(basicSub));
        when(loanRepository.countByUserAndStatus(user, LoanStatus.ACTIVE)).thenReturn(0L);
        when(loanRepository.save(any())).thenAnswer(inv -> {
            Loan l = inv.getArgument(0);
            l = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                    .borrowedAt(l.getBorrowedAt()).dueDate(l.getDueDate())
                    .status(LoanStatus.ACTIVE).build();
            return l;
        });

        var result = loanService.borrow(req, "member@example.com");

        assertThat(result.status()).isEqualTo("ACTIVE");
        assertThat(book.getAvailableCopies()).isEqualTo(1);
        verify(events).publish(eq(Topics.LOAN_EVENTS), eq("loan.created"), any(), any(Map.class));
    }

    @Test
    void borrow_noCopiesAvailable_throws() {
        book.setAvailableCopies(0);
        var req = new LoanRequest(book.getId(), 14);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(bookService.findOrThrow(book.getId())).thenReturn(book);

        assertThatThrownBy(() -> loanService.borrow(req, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No copies available");
    }

    @Test
    void borrow_basicPlanLimitExceeded_throws() {
        var req = new LoanRequest(book.getId(), 14);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(bookService.findOrThrow(book.getId())).thenReturn(book);
        when(subscriptionRepository.findByUserAndStatus(user, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(basicSub));
        when(loanRepository.countByUserAndStatus(user, LoanStatus.ACTIVE)).thenReturn(3L);

        assertThatThrownBy(() -> loanService.borrow(req, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Loan limit reached");
    }

    @Test
    void returnBook_success_incrementsStockAndPromotesWaitlist() {
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(1)).dueDate(LocalDateTime.now().plusDays(13))
                .status(LoanStatus.ACTIVE).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));
        when(loanRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = loanService.returnBook(loan.getId(), "member@example.com");

        assertThat(result.status()).isEqualTo("RETURNED");
        assertThat(book.getAvailableCopies()).isEqualTo(3);
        verify(events).publish(eq(Topics.LOAN_EVENTS), eq("loan.returned"), any(), any(Map.class));
        verify(reservationService).promoteNextWaiting(book);
    }

    @Test
    void returnBook_alreadyReturned_throws() {
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(5)).dueDate(LocalDateTime.now().plusDays(9))
                .returnedAt(LocalDateTime.now()).status(LoanStatus.RETURNED).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.returnBook(loan.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already returned");
    }

    @Test
    void renew_success_extendsDueDateFromCurrentDueDate() {
        LocalDateTime originalDueDate = LocalDateTime.now().plusDays(3);
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(11)).dueDate(originalDueDate)
                .status(LoanStatus.ACTIVE).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));
        when(reservationService.hasActiveQueue(book)).thenReturn(false);
        when(loanRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = loanService.renew(loan.getId(), "member@example.com");

        assertThat(result.renewed()).isTrue();
        assertThat(loan.getDueDate()).isEqualTo(originalDueDate.plusDays(14));
        verify(events).publish(eq(Topics.LOAN_EVENTS), eq("loan.renewed"), any(), any(Map.class));
    }

    @Test
    void renew_overdueLoan_extendsFromNowInsteadOfPastDueDate() {
        LocalDateTime pastDueDate = LocalDateTime.now().minusDays(2);
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(16)).dueDate(pastDueDate)
                .status(LoanStatus.ACTIVE).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));
        when(reservationService.hasActiveQueue(book)).thenReturn(false);
        when(loanRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        loanService.renew(loan.getId(), "member@example.com");

        assertThat(loan.getDueDate()).isAfter(LocalDateTime.now().plusDays(13));
    }

    @Test
    void renew_alreadyRenewed_throws() {
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(1)).dueDate(LocalDateTime.now().plusDays(13))
                .status(LoanStatus.ACTIVE).renewed(true).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.renew(loan.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already been renewed");
    }

    @Test
    void renew_returnedLoan_throws() {
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(5)).dueDate(LocalDateTime.now().minusDays(1))
                .returnedAt(LocalDateTime.now()).status(LoanStatus.RETURNED).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.renew(loan.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only active loans");
    }

    @Test
    void renew_activeWaitlist_throws() {
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(user).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(1)).dueDate(LocalDateTime.now().plusDays(13))
                .status(LoanStatus.ACTIVE).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));
        when(reservationService.hasActiveQueue(book)).thenReturn(true);

        assertThatThrownBy(() -> loanService.renew(loan.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("someone else is waiting");
    }

    @Test
    void renew_wrongUser_throws() {
        User otherUser = User.builder().id(UUID.randomUUID()).email("other@example.com").role(Role.MEMBER).build();
        Loan loan = Loan.builder().id(UUID.randomUUID()).user(otherUser).book(book)
                .borrowedAt(LocalDateTime.now().minusDays(1)).dueDate(LocalDateTime.now().plusDays(13))
                .status(LoanStatus.ACTIVE).build();
        when(loanRepository.findById(loan.getId())).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.renew(loan.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("does not belong");
    }
}
