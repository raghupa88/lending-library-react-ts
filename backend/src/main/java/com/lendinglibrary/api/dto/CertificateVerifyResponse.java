package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Certificate;

import java.time.LocalDateTime;

/** Public verification payload — deliberately excludes email/user id, only what a verifier needs. */
public record CertificateVerifyResponse(
        String serial, String learnerName, String courseTitle, LocalDateTime issuedAt
) {
    public static CertificateVerifyResponse from(Certificate c) {
        return new CertificateVerifyResponse(
                c.getSerial(), c.getUser().getFirstName() + " " + c.getUser().getLastName(),
                c.getCourse().getTitle(), c.getIssuedAt()
        );
    }
}
