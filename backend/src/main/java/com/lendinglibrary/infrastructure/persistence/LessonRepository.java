package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.CourseModule;
import com.lendinglibrary.domain.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findByModuleOrderBySortOrderAsc(CourseModule module);
    int countByModule(CourseModule module);
    long countByModuleCourse(Course course);
}
