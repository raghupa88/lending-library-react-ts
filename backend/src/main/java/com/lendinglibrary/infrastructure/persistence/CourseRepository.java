package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {

    boolean existsBySlug(String slug);

    Optional<Course> findBySlugAndStatus(String slug, CourseStatus status);

    @Query("""
            SELECT c FROM Course c
            WHERE c.status = :status
              AND (:track IS NULL OR c.track = :track)
              AND (:level IS NULL OR c.level = :level)
              AND (:language IS NULL OR LOWER(c.language) = LOWER(:language))
            """)
    Page<Course> findPublished(
            @Param("status") CourseStatus status,
            @Param("track") CourseTrack track,
            @Param("level") CourseLevel level,
            @Param("language") String language,
            Pageable pageable
    );
}
