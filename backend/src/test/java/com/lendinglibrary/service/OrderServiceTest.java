package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.application.service.OrderService;
import com.lendinglibrary.application.service.PaymentService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.Order;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.OrderStatus;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.persistence.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository orderRepository;
    @Mock UserService userService;
    @Mock PaymentService paymentService;
    @InjectMocks OrderService orderService;

    private User user;
    private Order order;
    private PaymentInput validCard;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        order = Order.builder().id(UUID.randomUUID()).user(user)
                .totalAmount(new BigDecimal("20.00")).status(OrderStatus.PENDING).notes("Late fee").build();
        validCard = new PaymentInput("Test Member", "4242424242424242", "12", "2030", "123");
    }

    @Test
    void pay_success_marksOrderCompleted() {
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(paymentService.charge(user, PaymentPurpose.LATE_FEE, order.getId(), order.getTotalAmount(), validCard))
                .thenReturn(Payment.builder().status(PaymentStatus.SUCCEEDED).build());
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = orderService.pay(order.getId(), "member@example.com", validCard);

        assertThat(result.status()).isEqualTo("completed");
    }

    @Test
    void pay_declinedPayment_leavesOrderPendingAndThrows() {
        PaymentInput declinedCard = new PaymentInput("Test Member", "4000000000000002", "12", "2030", "123");
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(paymentService.charge(user, PaymentPurpose.LATE_FEE, order.getId(), order.getTotalAmount(), declinedCard))
                .thenReturn(Payment.builder().status(PaymentStatus.FAILED).failureReason("Your card was declined").build());

        assertThatThrownBy(() -> orderService.pay(order.getId(), "member@example.com", declinedCard))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("declined");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
    }

    @Test
    void pay_alreadyCompleted_throws() {
        order.setStatus(OrderStatus.COMPLETED);
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(userService.findByEmail("member@example.com")).thenReturn(user);

        assertThatThrownBy(() -> orderService.pay(order.getId(), "member@example.com", validCard))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("isn't awaiting payment");
    }

    @Test
    void pay_wrongUser_throws() {
        User otherUser = User.builder().id(UUID.randomUUID()).email("other@example.com").role(Role.MEMBER).build();
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(userService.findByEmail("other@example.com")).thenReturn(otherUser);

        assertThatThrownBy(() -> orderService.pay(order.getId(), "other@example.com", validCard))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("doesn't belong to you");
    }
}
