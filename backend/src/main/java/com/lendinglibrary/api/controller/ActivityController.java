package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.ActivityEntryResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.ActivityQueryService;
import com.lendinglibrary.application.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/activity")
@RequiredArgsConstructor
@Tag(name = "Activity")
@SecurityRequirement(name = "bearerAuth")
public class ActivityController {

    private final ActivityQueryService activityQueryService;
    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "The current user's recent activity, newest first (empty unless the cassandra profile is active)")
    public ResponseEntity<ApiResponse<List<ActivityEntryResponse>>> mine(@AuthenticationPrincipal UserDetails user) {
        var userId = userService.findByEmail(user.getUsername()).getId();
        return ResponseEntity.ok(ApiResponse.ok(activityQueryService.recentFor(userId)));
    }
}
