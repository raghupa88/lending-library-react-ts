package com.lendinglibrary.domain.entity;

import lombok.*;
import org.springframework.data.cassandra.core.mapping.Column;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;

import java.util.UUID;

/** A row in {@code book_borrow_counts} — a genuine counter column, see cql/schema.cql and ADR-025. */
@Table("book_borrow_counts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BookBorrowCount {

    @PrimaryKey("book_id")
    private UUID bookId;

    @Column("borrow_count")
    private long borrowCount;
}
