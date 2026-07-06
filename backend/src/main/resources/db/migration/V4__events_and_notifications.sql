-- Transactional outbox: domain events are written in the same transaction
-- as the business change, then published to Kafka by a poller. This avoids
-- the dual-write problem (DB commit succeeds, broker publish fails, or vice
-- versa) without needing a two-phase commit.
CREATE TABLE outbox_events (
    id            UUID PRIMARY KEY,
    topic         VARCHAR(255) NOT NULL,
    aggregate_id  VARCHAR(255) NOT NULL,
    event_type    VARCHAR(100) NOT NULL,
    payload       TEXT         NOT NULL,
    created_at    TIMESTAMP    NOT NULL,
    published_at  TIMESTAMP,
    attempts      INTEGER      NOT NULL DEFAULT 0
);

-- Plain (non-partial) index for H2/Postgres portability; the poller query
-- filters published_at IS NULL and this still lets it avoid a full scan.
CREATE INDEX idx_outbox_published_created ON outbox_events (published_at, created_at);

-- Consumer-side idempotency: Kafka is at-least-once, so a redelivered event
-- must be a no-op. Recording the event id here before acting on it makes
-- the notification consumer idempotent.
CREATE TABLE processed_events (
    event_id     UUID PRIMARY KEY,
    processed_at TIMESTAMP NOT NULL
);

CREATE TABLE notifications (
    id         UUID PRIMARY KEY,
    user_id    UUID         NOT NULL,
    type       VARCHAR(100) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    body       TEXT,
    read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at);
