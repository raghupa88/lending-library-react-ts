package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.BookBorrowCount;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;

import java.util.UUID;

public interface BookBorrowCountRepository extends CassandraRepository<BookBorrowCount, UUID> {

    /**
     * Counter columns can only be incremented/decremented in place, never
     * written with an arbitrary value via save() — this is a real CQL
     * constraint, not a stylistic choice.
     */
    @Query("UPDATE book_borrow_counts SET borrow_count = borrow_count + 1 WHERE book_id = ?0")
    void increment(UUID bookId);
}
