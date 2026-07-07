package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.LearnTest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearnTestRepository extends JpaRepository<LearnTest, UUID> {
    List<LearnTest> findByCourse(Course course);
}
