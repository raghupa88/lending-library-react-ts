package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

/**
 * Dual-mode token delivery (ADR-004):
 * - Web clients (default): the refresh token travels only in an httpOnly
 *   cookie scoped to /api/v1/auth; it is stripped from the JSON body.
 * - Native clients send "X-Client-Type: native" and get the refresh token
 *   in the body to keep in platform secure storage.
 * The same rotation/reuse-detection service backs both flows.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    static final String REFRESH_COOKIE = "refresh_token";
    private static final String NATIVE = "native";

    private final AuthService authService;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    @Value("${auth.cookie-secure:false}")
    private boolean cookieSecure;

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest req,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType) {
        return deliver(authService.register(req), clientType, "User registered successfully");
    }

    @PostMapping("/login")
    @Operation(summary = "Login and get tokens")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest req,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType) {
        return deliver(authService.login(req), clientType, null);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate the refresh token and mint a new access token")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @RequestBody(required = false) RefreshRequest req,
            @CookieValue(value = REFRESH_COOKIE, required = false) String cookieToken,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType) {
        String raw = cookieToken != null ? cookieToken
                : (req != null ? req.refreshToken() : null);
        return deliver(authService.refresh(raw), clientType, null);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout: revoke the refresh-token family and clear the cookie")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) RefreshRequest req,
            @CookieValue(value = REFRESH_COOKIE, required = false) String cookieToken) {
        authService.logout(cookieToken != null ? cookieToken
                : (req != null ? req.refreshToken() : null));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredCookie().toString())
                .body(ApiResponse.ok(null, "Logged out successfully"));
    }

    private ResponseEntity<ApiResponse<AuthResponse>> deliver(
            AuthResponse auth, String clientType, String message) {
        if (NATIVE.equalsIgnoreCase(clientType)) {
            return ResponseEntity.ok(ApiResponse.ok(auth, message));
        }
        // Web: refresh token lives only in the httpOnly cookie
        AuthResponse webBody = new AuthResponse(
                auth.userId(), auth.email(), auth.name(), auth.role(), auth.plan(),
                auth.accessToken(), null);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(auth.refreshToken()).toString())
                .body(ApiResponse.ok(webBody, message));
    }

    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ofMillis(refreshExpirationMs))
                .build();
    }

    private ResponseCookie expiredCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(0)
                .build();
    }
}
