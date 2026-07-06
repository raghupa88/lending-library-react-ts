package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.AdminLoanResponse;
import com.lendinglibrary.api.dto.AdminUserResponse;
import com.lendinglibrary.domain.enums.LoanStatus;
import com.lendinglibrary.domain.enums.SubscriptionStatus;
import com.lendinglibrary.infrastructure.persistence.LoanRepository;
import com.lendinglibrary.infrastructure.persistence.SubscriptionRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final LoanRepository loanRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(u -> u.getCreatedAt() == null ? "" : u.getCreatedAt().toString()))
                .map(user -> new AdminUserResponse(
                        user.getId(),
                        user.getFirstName() + " " + user.getLastName(),
                        user.getEmail(),
                        user.getRole().name().toLowerCase(),
                        user.isActive(),
                        subscriptionRepository
                                .findByUserAndStatus(user, SubscriptionStatus.ACTIVE)
                                .map(sub -> sub.getPlan().name().toLowerCase())
                                .orElse(null),
                        loanRepository.countByUserAndStatus(user, LoanStatus.ACTIVE),
                        user.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminLoanResponse> listLoans(String status) {
        return loanRepository.findAll().stream()
                .map(AdminLoanResponse::from)
                .filter(loan -> status == null || status.isBlank()
                        || loan.status().equalsIgnoreCase(status))
                .sorted(Comparator.comparing(AdminLoanResponse::borrowedAt).reversed())
                .toList();
    }
}
