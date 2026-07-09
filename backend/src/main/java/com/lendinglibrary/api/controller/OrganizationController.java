package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.OrganizationJoinRequest;
import com.lendinglibrary.api.dto.OrganizationPurchaseRequest;
import com.lendinglibrary.api.dto.OrganizationResponse;
import com.lendinglibrary.api.dto.SubscriptionResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.OrganizationService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
@Tag(name = "Organizations (B2B)")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationController {

    private final OrganizationService organizationService;

    @PostMapping
    @Operation(summary = "Buy N seats of a plan for a school/company")
    public ResponseEntity<ApiResponse<OrganizationResponse>> purchase(
            @Valid @RequestBody OrganizationPurchaseRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                organizationService.purchase(req, user.getUsername()), "Business account created"));
    }

    @GetMapping("/mine")
    @Operation(summary = "Get the business account I own, with its member roster")
    public ResponseEntity<ApiResponse<OrganizationResponse>> mine(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.mine(user.getUsername())));
    }

    @PostMapping("/join")
    @Operation(summary = "Join an organization with its code while already signed in")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> join(
            @Valid @RequestBody OrganizationJoinRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                organizationService.join(req.joinCode(), user.getUsername()), "Joined organization"));
    }

    @DeleteMapping("/members/{userId}")
    @Operation(summary = "Remove a member from the business account I own")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails user) {
        organizationService.removeMember(user.getUsername(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Member removed"));
    }
}
