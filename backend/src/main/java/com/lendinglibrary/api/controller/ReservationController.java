package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.LoanResponse;
import com.lendinglibrary.api.dto.ReservationRequest;
import com.lendinglibrary.api.dto.ReservationResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.ReservationService;
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
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
@Tag(name = "Reservations")
@SecurityRequirement(name = "bearerAuth")
public class ReservationController {

    private final ReservationService reservationService;

    @GetMapping
    @Operation(summary = "Get current user's reservations")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> myReservations(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(reservationService.myReservations(user.getUsername())));
    }

    @PostMapping
    @Operation(summary = "Join the waitlist for a book with no copies available")
    public ResponseEntity<ApiResponse<ReservationResponse>> join(
            @Valid @RequestBody ReservationRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                reservationService.join(req.bookId(), user.getUsername()), "You're on the waitlist"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Leave the waitlist / release a hold")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        reservationService.cancel(id, user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null, "Reservation cancelled"));
    }

    @PostMapping("/{id}/claim")
    @Operation(summary = "Claim a ready-for-pickup hold as a loan")
    public ResponseEntity<ApiResponse<LoanResponse>> claim(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                reservationService.claim(id, user.getUsername()), "Book borrowed from your hold"));
    }
}
