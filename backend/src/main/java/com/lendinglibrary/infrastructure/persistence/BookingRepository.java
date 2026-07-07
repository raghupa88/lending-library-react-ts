package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Batch;
import com.lendinglibrary.domain.entity.Booking;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByBatchAndUser(Batch batch, User user);
    long countByBatchAndStatus(Batch batch, BookingStatus status);
    List<Booking> findByBatchAndStatusOrderByBookedAtAsc(Batch batch, BookingStatus status);
    List<Booking> findByUserOrderByBookedAtDesc(User user);
}
