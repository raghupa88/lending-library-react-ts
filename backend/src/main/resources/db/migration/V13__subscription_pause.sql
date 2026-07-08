-- Pausing a subscription for a month (see docs/adr/ADR-019-subscription-pause.md)
-- needs to remember when the pause ends so the auto-resume sweep knows.
ALTER TABLE subscriptions ADD COLUMN paused_until TIMESTAMP;
