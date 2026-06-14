package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.LoanRequest;
import com.lendinglibrary.api.dto.LoanResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.LoanService;
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
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
@Tag(name = "Loans")
@SecurityRequirement(name = "bearerAuth")
public class LoanController {

    private final LoanService loanService;

    @GetMapping
    @Operation(summary = "Get current user's loans")
    public ResponseEntity<ApiResponse<List<LoanResponse>>> getUserLoans(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.getUserLoans(user.getUsername())));
    }

    @PostMapping
    @Operation(summary = "Borrow a book")
    public ResponseEntity<ApiResponse<LoanResponse>> borrow(
            @Valid @RequestBody LoanRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(loanService.borrow(req, user.getUsername()), "Book borrowed successfully"));
    }

    @PutMapping("/{id}/return")
    @Operation(summary = "Return a borrowed book")
    public ResponseEntity<ApiResponse<LoanResponse>> returnBook(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                loanService.returnBook(id, user.getUsername()), "Book returned successfully"));
    }
}
