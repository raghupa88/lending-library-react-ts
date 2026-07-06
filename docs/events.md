# Domain events

Every event on these topics shares the same envelope
(`backend/.../infrastructure/events/DomainEvent.java`):

```json
{
  "eventId": "uuid",
  "type": "loan.created",
  "aggregateId": "loan-or-subscription-or-book-id",
  "occurredAt": "2026-07-06T10:00:00",
  "data": { "...": "event-specific fields, see below" }
}
```

Kafka message key = `aggregateId`, so events for the same aggregate stay
ordered on one partition. Delivery is **at-least-once** — consumers must be
idempotent (see `ProcessedEvent` / `NotificationConsumer`).

## `library.loan.events`

| type | emitted from | `data` fields |
|---|---|---|
| `loan.created` | `LoanService.borrow` | `userId`, `userEmail`, `bookId`, `bookTitle`, `dueDate` |
| `loan.returned` | `LoanService.returnBook` | `userId`, `userEmail`, `bookId`, `bookTitle` |

## `library.subscription.events`

| type | emitted from | `data` fields |
|---|---|---|
| `subscription.changed` | `SubscriptionService.subscribe` | `userId`, `userEmail`, `plan`, `monthlyPrice` |

## `library.book.events`

| type | emitted from | `data` fields |
|---|---|---|
| `book.updated` | `BookService.create` / `.update` | `action` (`created`/`updated`), `title`, `author` |

No consumer exists yet — this topic is seeded now so the Elasticsearch
search-index phase can subscribe without touching the producers.

## `library.payment.events` (reserved)

No producer yet — reserved for the payments phase (`payment.completed`,
`payment.failed`).

## Consumers

| Consumer | Topics | Group | Behavior |
|---|---|---|---|
| `NotificationConsumer` | loan, subscription events | `notifications` | Writes an in-app `notifications` row + best-effort email (Mailpit in dev). Idempotent via `ProcessedEvent` (checked before acting, recorded after). |

## Adding a new event

1. Call `DomainEventPublisher.publish(topic, type, aggregateId, data)` from
   inside the emitting service's existing `@Transactional` method — never
   from outside a transaction (the publisher enforces `MANDATORY`
   propagation and will throw if you try).
2. Document the event here.
3. Consumers are plain `@KafkaListener` methods gated behind `@Profile("kafka")`
   (see `NotificationConsumer`) — they never run without the `kafka` Spring
   profile, so local dev without Docker is unaffected.
