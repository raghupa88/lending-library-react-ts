package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Attendance;
import com.lendinglibrary.domain.entity.BatchSession;
import com.lendinglibrary.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    Optional<Attendance> findBySessionAndUser(BatchSession session, User user);
    List<Attendance> findBySession(BatchSession session);
}
