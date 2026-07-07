-- Suvadi Learn L4: in-person classes. A batch is a scheduled run of a
-- course at a venue; booking a seat is independent of online enrollment
-- (see docs/adr/ADR-012-learn-l4-scope.md) — capacity-limited with a
-- waitlist, promoted in booked_at order when a confirmed seat opens up.

CREATE TABLE venues (
    id              UUID PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    address         VARCHAR(500),
    city            VARCHAR(100) NOT NULL,
    capacity_default INTEGER     NOT NULL
);

CREATE TABLE batches (
    id              UUID PRIMARY KEY,
    course_id       UUID           NOT NULL,
    venue_id        UUID           NOT NULL,
    instructor_name VARCHAR(255)   NOT NULL,
    starts_on       DATE           NOT NULL,
    ends_on         DATE           NOT NULL,
    schedule_text   VARCHAR(255)   NOT NULL,
    capacity        INTEGER        NOT NULL,
    fee             NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status          VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT fk_batches_course FOREIGN KEY (course_id) REFERENCES courses (id),
    CONSTRAINT fk_batches_venue FOREIGN KEY (venue_id) REFERENCES venues (id)
);

CREATE TABLE batch_sessions (
    id           UUID PRIMARY KEY,
    batch_id     UUID         NOT NULL,
    session_date DATE         NOT NULL,
    topic        VARCHAR(255) NOT NULL,
    CONSTRAINT fk_batch_sessions_batch FOREIGN KEY (batch_id) REFERENCES batches (id)
);

CREATE TABLE bookings (
    id        UUID PRIMARY KEY,
    batch_id  UUID        NOT NULL,
    user_id   UUID        NOT NULL,
    status    VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    booked_at TIMESTAMP   NOT NULL,
    CONSTRAINT fk_bookings_batch FOREIGN KEY (batch_id) REFERENCES batches (id),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE attendance (
    id                UUID PRIMARY KEY,
    batch_session_id  UUID    NOT NULL,
    user_id           UUID    NOT NULL,
    present           BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_attendance_session FOREIGN KEY (batch_session_id) REFERENCES batch_sessions (id),
    CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_attendance_session_user UNIQUE (batch_session_id, user_id)
);

CREATE INDEX idx_batches_course ON batches (course_id);
CREATE INDEX idx_batch_sessions_batch ON batch_sessions (batch_id, session_date);
CREATE INDEX idx_bookings_batch ON bookings (batch_id, status, booked_at);
CREATE INDEX idx_bookings_user ON bookings (user_id);
