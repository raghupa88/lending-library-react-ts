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
| `reservation.ready` | `ReservationService.promoteNextWaiting` | `userId`, `userEmail`, `bookId`, `bookTitle`, `holdExpiresAt` |

`BookSearchConsumer` (elasticsearch profile) subscribes to `book.updated` —
it re-fetches the full row by `aggregateId` rather than needing every
searchable field carried in the payload, so this event didn't need to
grow when that consumer was added. `NotificationConsumer` subscribes to
this topic too, but only acts on `reservation.ready` (see ADR-016) — a
`book.updated` admin edit has no single notification recipient, so it's
ignored there.

## `library.course.events`

| type | emitted from | `data` fields |
|---|---|---|
| `course.enrolled` | `EnrollmentService.enroll` | `userId`, `userEmail`, `courseId`, `courseTitle` |
| `test.passed` | `AttemptService` (on a passing submission) | `userId`, `userEmail`, `courseId`, `testId`, `scorePercent` |
| `batch.booked` | `BookingService.publishBatchBooked` | `userId`, `userEmail`, `batchId`, `courseTitle` |

All three are Suvadi Learn events (ADR-009 through ADR-012); despite the
topic name they're keyed by the enrollment/attempt/booking id, not a course id.

## `library.user.events`

| type | emitted from | `data` fields |
|---|---|---|
| `referral.credited` | `AuthService.register` (when a valid referral code is used) | `userId`, `userEmail`, `referredName`, `creditAmount` |
| `gift.received` | `GiftService.purchase` (only if the recipient is already a registered member) | `userId`, `userEmail`, `purchaserName`, `plan`, `giftCode` |
| `gift.redeemed` | `GiftService.redeem` | `userId`, `userEmail`, `redeemedByName`, `plan` |

See ADR-021 (referral credits) and ADR-022 (gift subscriptions).

## `library.payment.events`

| type | emitted from | `data` fields |
|---|---|---|
| `payment.succeeded` | `PaymentService.charge` | `userId`, `userEmail`, `purpose`, `referenceId`, `amount` |
| `payment.failed` | `PaymentService.charge` | `userId`, `userEmail`, `purpose`, `referenceId`, `amount` |

`purpose` is a `PaymentPurpose` enum value (e.g. `COURSE_ENROLLMENT`,
`BATCH_BOOKING`, `ORGANIZATION_SEATS`) — see `ADR-013` (Learn payments) and
`ADR-024` (B2B org purchases), the two features that call `PaymentService.charge`.

## Consumers

| Consumer | Topics | Group | Behavior |
|---|---|---|---|
| `NotificationConsumer` | loan, subscription, course, book, user events | `notifications` | Writes an in-app `notifications` row + best-effort email (Mailpit in dev) for a specific type on each topic — every `loan`/`subscription`/`course`/`user` event type, but only `reservation.ready` on the book topic (`book.updated` has no single recipient). Idempotent via `ProcessedEvent` (checked before acting, recorded after). |
| `ActivityConsumer` (cassandra profile) | loan, subscription, course, book, user, payment events | `activity-feed` | Writes a Cassandra `activity_by_user` row per event and increments `book_borrow_counts` on `loan.created`. See ADR-025. |
| `BookSearchConsumer` (elasticsearch profile) | book, loan events | `book-search` | Re-indexes the `books` Elasticsearch document by re-fetching the current row from Postgres on `book.updated` and on `loan.created`/`loan.returned` (which change `availableCopies`). Naturally idempotent — no processed-events table needed. See ADR-026. |

## Adding a new event

1. Call `DomainEventPublisher.publish(topic, type, aggregateId, data)` from
   inside the emitting service's existing `@Transactional` method — never
   from outside a transaction (the publisher enforces `MANDATORY`
   propagation and will throw if you try).
2. Document the event here.
3. Consumers are plain `@KafkaListener` methods gated behind `@Profile("kafka")`
   (see `NotificationConsumer`) — they never run without the `kafka` Spring
   profile, so local dev without Docker is unaffected.
