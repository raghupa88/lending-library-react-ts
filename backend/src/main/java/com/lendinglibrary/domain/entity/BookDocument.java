package com.lendinglibrary.domain.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

/**
 * The {@code books} Elasticsearch index — a deliberately narrow document
 * carrying only what search/filter needs, not the full {@link Book} row
 * (title/author full-text, category/language exact-match facets,
 * available-copies for the availability filter). Search resolves matching
 * IDs; the full {@code BookResponse} is still built from Postgres. See
 * ADR-026.
 */
@Document(indexName = "books")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BookDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text)
    private String title;

    @Field(type = FieldType.Text)
    private String author;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Keyword)
    private String language;

    @Field(type = FieldType.Integer)
    private int availableCopies;

    public static BookDocument from(Book book) {
        return BookDocument.builder()
                .id(book.getId().toString())
                .title(book.getTitle())
                .author(book.getAuthor())
                .category(book.getCategory())
                .language(book.getLanguage())
                .availableCopies(book.getAvailableCopies())
                .build();
    }
}
