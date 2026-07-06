package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.CourseModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CourseModuleRepository extends JpaRepository<CourseModule, UUID> {
    List<CourseModule> findByCourseOrderBySortOrderAsc(Course course);
    int countByCourse(Course course);
}
