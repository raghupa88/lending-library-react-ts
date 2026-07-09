-- Annual billing at a discount (see docs/adr/ADR-020-annual-billing.md).
-- Existing rows default to MONTHLY, matching how every subscription so far was billed.
ALTER TABLE subscriptions ADD COLUMN billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY';
