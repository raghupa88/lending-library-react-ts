package com.lendinglibrary.api.dto;

/**
 * Body-based refresh token, used by native clients only — web clients send
 * the token via the httpOnly cookie instead, so the field is optional.
 */
public record RefreshRequest(String refreshToken) {}
