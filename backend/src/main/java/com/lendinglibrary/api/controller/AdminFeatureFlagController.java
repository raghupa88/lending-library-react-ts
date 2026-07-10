package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.FeatureFlagRequest;
import com.lendinglibrary.api.dto.FeatureFlagResponse;
import com.lendinglibrary.api.dto.SetFeatureFlagEnabledRequest;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.FeatureFlagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/feature-flags")
@RequiredArgsConstructor
@Tag(name = "Admin - Feature flags")
@SecurityRequirement(name = "bearerAuth")
public class AdminFeatureFlagController {

    private final FeatureFlagService featureFlagService;

    @GetMapping
    @Operation(summary = "List all feature flags")
    public ResponseEntity<ApiResponse<List<FeatureFlagResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(featureFlagService.list()));
    }

    @PostMapping
    @Operation(summary = "Create a new feature flag")
    public ResponseEntity<ApiResponse<FeatureFlagResponse>> create(@Valid @RequestBody FeatureFlagRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(featureFlagService.create(req), "Feature flag created"));
    }

    @PutMapping("/{key}")
    @Operation(summary = "Turn a feature flag on or off")
    public ResponseEntity<ApiResponse<FeatureFlagResponse>> setEnabled(
            @PathVariable String key, @Valid @RequestBody SetFeatureFlagEnabledRequest req) {
        var updated = featureFlagService.setEnabled(key, req.enabled());
        return ResponseEntity.ok(ApiResponse.ok(updated, updated.enabled() ? "Flag enabled" : "Flag disabled"));
    }
}
