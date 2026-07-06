package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.Enrollment;
import com.lendinglibrary.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    List<Enrollment> findByUserOrderByEnrolledAtDesc(User user);
    Optional<Enrollment> findByUserAndCourse(User user, Course course);
}
