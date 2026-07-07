package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
}
