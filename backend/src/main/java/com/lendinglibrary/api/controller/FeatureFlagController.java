package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.FeatureFlagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/feature-flags")
@RequiredArgsConstructor
@Tag(name = "Feature flags")
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;

    @GetMapping
    @Operation(summary = "Currently enabled feature flag keys — public, drives frontend UI gating")
    public ResponseEntity<ApiResponse<Set<String>>> enabledKeys() {
        return ResponseEntity.ok(ApiResponse.ok(featureFlagService.listEnabledKeys()));
    }
}
