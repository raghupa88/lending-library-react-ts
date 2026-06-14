package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.OrderRequest;
import com.lendinglibrary.api.dto.OrderResponse;
import com.lendinglibrary.domain.entity.Order;
import com.lendinglibrary.domain.enums.OrderStatus;
import com.lendinglibrary.infrastructure.persistence.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserService userService;

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
}
