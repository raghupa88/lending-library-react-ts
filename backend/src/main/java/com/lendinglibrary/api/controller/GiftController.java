package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.GiftPurchaseRequest;
import com.lendinglibrary.api.dto.GiftRedeemRequest;
import com.lendinglibrary.api.dto.GiftSubscriptionResponse;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.GiftService;
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

@RestController
@RequestMapping("/api/v1/gifts")
@RequiredArgsConstructor
@Tag(name = "Gift subscriptions")
@SecurityRequirement(name = "bearerAuth")
public class GiftController {

    private final GiftService giftService;

    @PostMapping
    @Operation(summary = "Buy a subscription plan as a gift for someone else")
    public ResponseEntity<ApiResponse<GiftSubscriptionResponse>> purchase(
            @Valid @RequestBody GiftPurchaseRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                giftService.purchase(req, user.getUsername()), "Gift purchased"));
    }

    @GetMapping("/mine")
    @Operation(summary = "List gift subscriptions I've purchased")
    public ResponseEntity<ApiResponse<List<GiftSubscriptionResponse>>> mine(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(giftService.myGifts(user.getUsername())));
    }

    @PostMapping("/redeem")
    @Operation(summary = "Redeem a gift code while already signed in")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> redeem(
            @Valid @RequestBody GiftRedeemRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                giftService.redeem(req.giftCode(), user.getUsername()), "Gift redeemed"));
    }
}
