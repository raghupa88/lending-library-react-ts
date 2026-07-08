package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.OrderRequest;
import com.lendinglibrary.api.dto.OrderResponse;
import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.domain.entity.Order;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.OrderStatus;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserService userService;
    private final PaymentService paymentService;

    public List<OrderResponse> getUserOrders(String email) {
        var user = userService.findByEmail(email);
        return orderRepository.findByUserOrderByCreatedAtDesc(user)
                .stream().map(OrderResponse::from).toList();
    }

    @Transactional
    public OrderResponse create(OrderRequest req, String email) {
        var user = userService.findByEmail(email);
        Order order = Order.builder()
                .user(user).totalAmount(req.totalAmount())
                .status(OrderStatus.PENDING).notes(req.notes())
                .build();
        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse pay(UUID orderId, String email, PaymentInput input) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        User user = userService.findByEmail(email);
        if (!order.getUser().getId().equals(user.getId())) {
            throw new BusinessException("This order doesn't belong to you");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessException("This order isn't awaiting payment");
        }

        Payment payment = paymentService.charge(
                user, PaymentPurpose.LATE_FEE, order.getId(), order.getTotalAmount(), input);
        if (payment.getStatus() != PaymentStatus.SUCCEEDED) {
            throw new BusinessException(payment.getFailureReason());
        }

        order.setStatus(OrderStatus.COMPLETED);
        return OrderResponse.from(orderRepository.save(order));
    }
}
