package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.SubscriptionPlanResponse;
import com.lendinglibrary.api.dto.SubscriptionRequest;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/plans")
    @Operation(summary = "List available subscription plans")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanResponse>>> getPlans() {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionService.getPlans()));
    }

    @GetMapping("/current")
    @Operation(summary = "Get current user subscription")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> getCurrent(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionService.getCurrent(user.getUsername())));
    }

    @PostMapping
    @Operation(summary = "Subscribe to a plan")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> subscribe(
            @Valid @RequestBody SubscriptionRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                subscriptionService.subscribe(req, user.getUsername()), "Subscription updated"));
    }
}
