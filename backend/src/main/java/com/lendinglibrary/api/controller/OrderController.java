package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.OrderRequest;
import com.lendinglibrary.api.dto.OrderResponse;
import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders")
@SecurityRequirement(name = "bearerAuth")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Get current user's orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getUserOrders(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getUserOrders(user.getUsername())));
    }

    @PostMapping
    @Operation(summary = "Create an order")
    public ResponseEntity<ApiResponse<OrderResponse>> create(
            @Valid @RequestBody OrderRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(orderService.create(req, user.getUsername()), "Order created"));
    }

    @PostMapping("/{id}/pay")
    @Operation(summary = "Pay an outstanding order (e.g. a late fee)")
    public ResponseEntity<ApiResponse<OrderResponse>> pay(
            @PathVariable UUID id,
            @RequestBody PaymentInput payment,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                orderService.pay(id, user.getUsername(), payment), "Payment successful"));
    }
}
