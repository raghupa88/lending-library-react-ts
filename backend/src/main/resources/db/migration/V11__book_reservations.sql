-- Reservations/waitlist for books with no copies available. Joining only
-- reserves a place in line; when a copy is returned the next WAITING
-- reservation is promoted to READY_FOR_PICKUP with a time-boxed hold
-- (see docs/adr/ADR-016-book-reservations.md) rather than just notifying,
-- since a bare notification would let anyone else grab the copy first.

CREATE TABLE reservations (
    id              UUID PRIMARY KEY,
    book_id         UUID        NOT NULL,
    user_id         UUID        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    reserved_at     TIMESTAMP   NOT NULL,
    hold_expires_at TIMESTAMP,
    CONSTRAINT fk_reservations_book FOREIGN KEY (book_id) REFERENCES books (id),
    CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_reservations_book ON reservations (book_id, status, reserved_at);
CREATE INDEX idx_reservations_user ON reservations (user_id);
