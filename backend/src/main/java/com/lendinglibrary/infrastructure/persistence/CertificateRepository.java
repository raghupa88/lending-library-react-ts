package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Certificate;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CertificateRepository extends JpaRepository<Certificate, UUID> {
    List<Certificate> findByUserOrderByIssuedAtDesc(User user);
    Optional<Certificate> findByUserAndCourse(User user, Course course);
    Optional<Certificate> findBySerial(String serial);
}
