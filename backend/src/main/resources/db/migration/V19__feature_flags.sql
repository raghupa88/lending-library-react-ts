-- "key" is a reserved word in H2 (and some other SQL dialects), hence flag_key.
CREATE TABLE feature_flags (
    id          UUID PRIMARY KEY,
    flag_key    VARCHAR(100) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

-- Seeded enabled=true so the B2B tier's existing behavior doesn't change
-- for anyone the moment this migration runs — the flag exists to let an
-- admin turn it OFF going forward, not to silently disable it on deploy.
INSERT INTO feature_flags (id, flag_key, name, description, enabled, created_at, updated_at)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'b2b_tier',
    'B2B tier (schools & businesses)',
    'Bulk seat purchases and org join codes — see ADR-024.',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
