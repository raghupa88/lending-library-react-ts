-- One-time due-date extension per loan (see docs/adr/ADR-017-loan-renewals.md).
ALTER TABLE loans ADD COLUMN renewed BOOLEAN NOT NULL DEFAULT FALSE;
