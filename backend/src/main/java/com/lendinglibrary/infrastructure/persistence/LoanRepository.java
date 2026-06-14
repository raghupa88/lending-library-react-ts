package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Loan;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanRepository extends JpaRepository<Loan, UUID> {
    List<Loan> findByUser(User user);
    long countByUserAndStatus(User user, LoanStatus status);
}
