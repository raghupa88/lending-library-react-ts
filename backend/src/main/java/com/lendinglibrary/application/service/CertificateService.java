package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.CertificateResponse;
import com.lendinglibrary.api.dto.CertificateVerifyResponse;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.CertificateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final UserService userService;

    public List<CertificateResponse> myCertificates(String email) {
        User user = userService.findByEmail(email);
        return certificateRepository.findByUserOrderByIssuedAtDesc(user).stream()
                .map(CertificateResponse::from).toList();
    }

    public CertificateVerifyResponse verify(String serial) {
        return certificateRepository.findBySerial(serial)
                .map(CertificateVerifyResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("No certificate found for serial: " + serial));
    }
}
