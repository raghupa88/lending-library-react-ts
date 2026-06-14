package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.LoanRequest;
import com.lendinglibrary.application.service.BookService;
import com.lendinglibrary.application.service.LoanService;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    @Mock LoanRepository loanRepository;
    @Mock BookService bookService;
    @Mock UserService userService;
    @Mock SubscriptionRepository subscriptionRepository;
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
}
