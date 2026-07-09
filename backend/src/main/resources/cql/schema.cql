-- Cassandra query-first schema (see ADR-025). Applied by the one-shot
-- `cassandra-init` compose service (`cqlsh -f`), not by Spring's
-- schema-action auto-DDL — same "migrations own the schema" stance as
-- Flyway/Postgres (ADR-007), just without a JVM migration library on the
-- Cassandra side.
CREATE KEYSPACE IF NOT EXISTS lending_library
    WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1};
    -- Single-node dev/demo replication factor. A real multi-DC deployment
    -- would use NetworkTopologyStrategy with RF >= 3 per DC.

USE lending_library;

-- Query: "this user's recent activity, newest first" — partitioned per
-- user so each read touches exactly one node's data for that partition,
-- the whole point of a query-first (not normalized) table design.
CREATE TABLE IF NOT EXISTS activity_by_user (
    user_id      uuid,
    occurred_at  timestamp,
    event_id     uuid,
    type         text,
    summary      text,
    PRIMARY KEY (user_id, occurred_at, event_id)
) WITH CLUSTERING ORDER BY (occurred_at DESC, event_id ASC);

-- Query: "how many times has this book been borrowed" — a genuine counter
-- column, incremented in place rather than read-modify-written. Note this
-- table can't be ORDER BY'd on borrow_count in CQL (counters don't support
-- secondary indexes or ALLOW FILTERING ordering); reading all rows and
-- sorting in the app is acceptable at this catalog's size, whereas a much
-- larger one would need a periodic batch job into a separate ranked table.
CREATE TABLE IF NOT EXISTS book_borrow_counts (
    book_id       uuid PRIMARY KEY,
    borrow_count  counter
);
