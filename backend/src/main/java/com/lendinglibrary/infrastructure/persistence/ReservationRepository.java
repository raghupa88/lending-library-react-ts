package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Book;
import com.lendinglibrary.domain.entity.Reservation;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    List<Reservation> findByBookAndStatusOrderByReservedAtAsc(Book book, ReservationStatus status);
    List<Reservation> findByUserOrderByReservedAtDesc(User user);
    List<Reservation> findByUserAndBookAndStatusIn(User user, Book book, List<ReservationStatus> statuses);
    List<Reservation> findByStatusAndHoldExpiresAtBefore(ReservationStatus status, LocalDateTime cutoff);
}
