package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Batch;
import com.lendinglibrary.domain.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BatchRepository extends JpaRepository<Batch, UUID> {
    List<Batch> findByCourse(Course course);
    List<Batch> findByCourseOrderByStartsOnAsc(Course course);
}
