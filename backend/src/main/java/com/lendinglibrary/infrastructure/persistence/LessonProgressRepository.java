package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Enrollment;
import com.lendinglibrary.domain.entity.Lesson;
import com.lendinglibrary.domain.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {
    List<LessonProgress> findByEnrollment(Enrollment enrollment);
    Optional<LessonProgress> findByEnrollmentAndLesson(Enrollment enrollment, Lesson lesson);
}
