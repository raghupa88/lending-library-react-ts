package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.NotificationResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "List the current user's notifications, newest first")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> list(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.list(user.getUsername())));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Unread notification count, for the navbar bell badge")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("count", notificationService.unreadCount(user.getUsername()))));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.markRead(id, user.getUsername())));
    }
}
