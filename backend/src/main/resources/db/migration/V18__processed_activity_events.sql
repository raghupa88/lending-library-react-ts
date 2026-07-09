-- A separate idempotency table for ActivityConsumer, deliberately not shared
-- with processed_events (NotificationConsumer's table): that table is keyed
-- only by event_id with no consumer discriminator, so if two independent
-- consumer groups both checked it, whichever one processed an event first
-- would mark it "done" and starve the other. Giving this consumer its own
-- table sidesteps that without retrofitting a composite key onto the
-- existing shared one.
CREATE TABLE processed_activity_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMP NOT NULL
);
