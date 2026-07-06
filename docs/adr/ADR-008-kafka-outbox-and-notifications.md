# ADR-008: Transactional outbox + Kafka for domain events, notifications as the first consumer

## Status
Accepted (2026-07-06)

## Context
The backend had no event backbone — loans, subscriptions, and admin book
changes were purely synchronous CRUD. Publishing to Kafka directly inside a
`@Transactional` business method is the classic dual-write trap: the DB
commit and the broker publish can't be made atomic, so a crash between them
either loses the event or double-processes it.

## Decision
1. **Transactional outbox.** `DomainEventPublisher.publish(...)` writes a row
   to `outbox_events` (Flyway `V4__events_and_notifications.sql`) using
   `@Transactional(propagation = MANDATORY)` — it must run inside the
   caller's own transaction, so the event row commits atomically with the
   business change it describes. `OutboxPublisher` (`@Profile("kafka")`,
   `@Scheduled` poller) reads unpublished rows and sends them to Kafka,
   marking `published_at` on success and leaving the row for retry on
   failure (least surprising: at-least-once, not "best effort with a
   silent ceiling"). Debezium/CDC-based outbox publishing is the documented
   production upgrade path once the poll-interval latency actually matters.
2. **Kafka in Zookeeper mode, deliberately.** `docker-compose.yml` runs
   Confluent's ZK-mode images because learning the classic
   broker/controller/Zookeeper architecture was an explicit goal. A
   `--profile kraft` alternative (single-node KRaft broker, no Zookeeper)
   is included specifically so the two can be compared side by side — that
   comparison is the lesson, not just running one or the other.
3. **Consumer-side idempotency is a real table, not a comment.** Kafka
   delivery is at-least-once; `ProcessedEvent` (keyed by `eventId`) is
   checked before acting on an event and written after, inside the same
   transaction as the side effect. `NotificationConsumer`'s redelivery test
   is the enforcement mechanism for this, not documentation.
4. **Notifications is the first (and only, for now) consumer.** It turns
   `loan.*`/`subscription.*` events into an in-app `notifications` row plus
   a best-effort email (Mailpit in dev). Email failure is deliberately
   non-fatal — the durable side effect (the notification row) already
   happened; a coupled mail step would let an SMTP hiccup take down an
   otherwise-successful event handler. `management.health.mail.enabled:
   false` keeps the same philosophy at the platform level: a transient SMTP
   outage must not flip actuator readiness/liveness to DOWN over a
   non-critical dependency (found live — the default Boot mail health
   indicator does exactly that).
5. **Everything Kafka/mail-related is `@Profile("kafka")`-gated**, and
   `spring-kafka`/`spring-boot-starter-mail` sit inertly on the classpath
   otherwise — neither client connects at startup, only on first send/
   listener-container creation, so dev and CI never need a broker.

## Consequences
- Adding a new event producer is one `DomainEventPublisher.publish(...)`
  call inside an existing transaction (see `docs/events.md`); adding a new
  consumer is one idempotent `@KafkaListener` method.
- The `book.updated` topic has no consumer yet — deliberately seeded now so
  the Elasticsearch search-index phase can subscribe without touching the
  three producer call sites.
- Verified live (no Docker daemon in this environment, so end-to-end
  broker delivery is a `docker compose up` checklist item, not something
  this session could exercise): outbox rows commit correctly inside the
  borrow/return/subscribe/admin-book-update transactions (all four calls
  succeeded against the running app — a failed outbox write would have
  rolled back the whole request); `DomainEventPublisherTest` proves the row
  shape against the real Flyway schema; `OutboxPublisherTest` and
  `NotificationConsumerTest` prove the publish-retry and
  idempotent-redelivery logic against a mocked `KafkaTemplate`/mail sender.
