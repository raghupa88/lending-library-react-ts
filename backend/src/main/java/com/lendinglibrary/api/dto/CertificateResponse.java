package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Certificate;

import java.time.LocalDateTime;
import java.util.UUID;

public record CertificateResponse(
        UUID id, String courseTitle, String courseSlug, LocalDateTime issuedAt, String serial
) {
    public static CertificateResponse from(Certificate c) {
        return new CertificateResponse(
                c.getId(), c.getCourse().getTitle(), c.getCourse().getSlug(), c.getIssuedAt(), c.getSerial());
    }
}
