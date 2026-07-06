-- Server-side refresh-token state for rotation and reuse detection.
-- Only the SHA-256 hash of a token is stored, never the raw value.

CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY,
    user_id    UUID         NOT NULL,
    token_hash VARCHAR(64)  NOT NULL,
    family_id  UUID         NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
