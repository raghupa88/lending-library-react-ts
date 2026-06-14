package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {

    @Query("""
            SELECT b FROM Book b
            WHERE (:search IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.author) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:category IS NULL OR LOWER(b.category) = LOWER(:category))
              AND (:language IS NULL OR LOWER(b.language) = LOWER(:language))
              AND (:available IS NULL OR (:available = true AND b.availableCopies > 0)
                                     OR (:available = false AND b.availableCopies = 0))
            """)
    Page<Book> findWithFilters(
            @Param("search") String search,
            @Param("category") String category,
            @Param("language") String language,
            @Param("available") Boolean available,
            Pageable pageable
    );
}
