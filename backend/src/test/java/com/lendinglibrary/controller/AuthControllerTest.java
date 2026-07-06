package com.lendinglibrary.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.api.controller.AuthController;
import com.lendinglibrary.api.dto.AuthResponse;
import com.lendinglibrary.api.dto.LoginRequest;
import com.lendinglibrary.application.service.AuthService;
import com.lendinglibrary.domain.exception.UnauthorizedException;
import com.lendinglibrary.infrastructure.security.JwtProvider;
import com.lendinglibrary.infrastructure.security.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AuthService authService;
    @MockBean JwtProvider jwtProvider;
    @MockBean UserDetailsServiceImpl userDetailsService;

    @Test
    void login_validCredentials_returns200() throws Exception {
        var response = new AuthResponse(UUID.randomUUID(), "member@example.com",
                "Member User", "member", "basic", "access-token", "refresh-token");
        when(authService.login(any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("member@example.com", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("member@example.com"))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                // Web mode: refresh token only in the httpOnly cookie, never the body
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("refresh_token=refresh-token")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("HttpOnly")));
    }

    @Test
    void login_nativeClient_getsRefreshTokenInBodyWithoutCookie() throws Exception {
        var response = new AuthResponse(UUID.randomUUID(), "member@example.com",
                "Member User", "member", "basic", "access-token", "refresh-token");
        when(authService.login(any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "native")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("member@example.com", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void refresh_readsTokenFromCookie() throws Exception {
        var response = new AuthResponse(UUID.randomUUID(), "member@example.com",
                "Member User", "member", "basic", "new-access", "rotated-refresh");
        when(authService.refresh("old-refresh")).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "old-refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("new-access"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("refresh_token=rotated-refresh")));
    }

    @Test
    void logout_revokesAndClearsCookie() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "some-refresh")))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("refresh_token=;")));

        org.mockito.Mockito.verify(authService).logout("some-refresh");
    }

    @Test
    void login_invalidCredentials_returns401() throws Exception {
        when(authService.login(any())).thenThrow(new UnauthorizedException("Invalid email or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("bad@example.com", "wrongpass"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Invalid email or password"));
    }

    @Test
    void login_missingEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"password123\"}"))
                .andExpect(status().isBadRequest());
    }
}
