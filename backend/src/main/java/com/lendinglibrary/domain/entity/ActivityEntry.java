package com.lendinglibrary.domain.entity;

import lombok.*;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;

/** A row in {@code activity_by_user} — see cql/schema.cql and ADR-025. */
@Table("activity_by_user")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityEntry {

    @PrimaryKey
    private ActivityEntryKey key;

    private String type;
    private String summary;
}
