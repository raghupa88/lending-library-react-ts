CREATE TABLE payments (
    id                UUID PRIMARY KEY,
    user_id           UUID           NOT NULL,
    purpose           VARCHAR(30)    NOT NULL,
    reference_id      UUID           NOT NULL,
    amount            NUMERIC(10, 2) NOT NULL,
    status            VARCHAR(20)    NOT NULL,
    provider_reference VARCHAR(255),
    failure_reason    VARCHAR(255),
    created_at        TIMESTAMP      NOT NULL,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_payments_reference ON payments (purpose, reference_id);

ALTER TABLE enrollments ADD COLUMN amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0;
