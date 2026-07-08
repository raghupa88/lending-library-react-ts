# ADR-016: Book reservations (hold/waitlist)

## Status
Accepted (2026-07-08)

## Context
Physical copies are finite. Before this branch, `availableCopies = 0` was a
dead end for members — the Book detail page just showed "Currently
unavailable" with no path forward. This was flagged as the top product gap
in the PM/principal-engineer review addendum: "Add hold/waitlist: join
queue on Book detail, auto-notify on return (the Kafka `loan.returned`
event already exists to drive it)."

## Decision
1. **A reservation is a real hold, not a bare notification.** When a copy
   is returned and someone is waiting, that copy is taken out of general
   circulation and held for the front of the queue for a fixed window
   (`reservations.hold-hours`, default 72h) — it is not put back in the
   pool with a "hey, it's back!" email. A notification alone would let
   anyone else borrow the copy before the waiting member acts on it,
   defeating the point of waiting in line. This is the one place this
   branch adds genuinely new logic beyond the existing L4 waitlist pattern
   (a promotion that also needs an expiry sweep, not just a promotion).
2. **Modeled directly on `Booking`/`BookingService` (ADR-012's batch
   waitlist)** — same shape, reused instead of inventing new abstractions:
   `Reservation` (`book`, `user`, `status`, `reservedAt`, `holdExpiresAt`),
   promotion in FIFO (`reservedAt`) order. `ReservationStatus` extends the
   `CONFIRMED/WAITLISTED/CANCELLED` idea with two extra states the hold
   window needs: `WAITING → READY_FOR_PICKUP → FULFILLED`, or
   `EXPIRED`/`CANCELLED` off either of the first two.
3. **Dependency direction avoids a service cycle.** `LoanService.returnBook`
   depends on `ReservationService.promoteNextWaiting(book)` (called right
   after the returned copy is credited back). `ReservationService.claim`
   needs to create a `Loan`, but does **not** call back into `LoanService`
   — it builds the `Loan` directly (a small, deliberate duplication of
   loan-creation, skipping the `availableCopies` check/decrement that
   `LoanService.borrow` does, since the copy was already earmarked when the
   hold was created). One-directional dependency, no cycle, and the two
   paths have genuinely different invariants (claiming a held copy vs.
   borrowing from the general pool) that would otherwise need a branchy
   shared method.
4. **Composable stock arithmetic.** `promoteNextWaiting` always decrements
   `availableCopies` by one when it hands a copy to the next waiter.
   Callers that are *releasing* a hold (cancel, expiry) first increment
   (put the copy back in the pool), then call `promoteNextWaiting` —net
   zero if someone's still waiting, net +1 back to the pool if the queue is
   empty. `LoanService.returnBook` already does its own increment as part
   of the existing return flow, so it calls `promoteNextWaiting` directly
   without a second increment. Verified in `ReservationServiceTest` and via
   a live curl smoke sequence (join → return → promote → claim, and
   cancel-while-held → release → re-promote).
5. **Expiry is a plain `@Scheduled` sweep, not Kafka-dependent.** The app
   already has `@EnableScheduling` on unconditionally (used today only by
   the `kafka`-profile-gated `OutboxPublisher`). Reservation expiry is a
   core domain rule that must run regardless of which profile is active —
   `ReservationService.expireStaleHolds()` polls every
   `reservations.expiry-sweep-interval-ms` (default 1h) with no `@Profile`
   guard, releasing any hold past `holdExpiresAt` and promoting the next
   waiter.
6. **`reservation.ready` rides the existing `BOOK_EVENTS` topic** (already
   had a producer — `book.updated` from admin edits — but no consumer).
   Added a `NotificationConsumer.onBookEvent` listener, same idempotent
   pattern as every other consumer method, still `@Profile("kafka")` since
   it's a notification side-channel, not core logic (unlike the expiry
   sweep).
7. **Endpoints are flat under `/api/v1/reservations`**, mirroring
   `LoanController`'s shape (`POST` join w/ `bookId` body, `GET` mine,
   `DELETE /{id}` cancel, `POST /{id}/claim`) rather than nesting under
   `/books/{id}/reservations` — nesting would have collided with
   `SecurityConfig`'s existing `permitAll` GET wildcard on `/books/**`,
   which would have accidentally made an authenticated "my reservations"
   list public.

## Consequences
- Backend: 119/119 unit tests pass (`mvn test`); no Docker/Testcontainers
  needed since this is exercised entirely through Mockito unit tests plus
  a manual live smoke run (see below) — no new `*IT.java` was warranted
  here, the interesting behavior (stock arithmetic, state transitions) is
  fully covered by mocks.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass. New `src/features/reservations/queries.ts`,
  Book detail waitlist UI, and a Dashboard "Your waitlist" section
  (join/leave/claim wired to real mutations with toasts).
- e2e: 6 new mocked Playwright specs in `e2e/specs/reservations.spec.ts`
  (signed-out redirect, join, waiting state, ready-for-pickup state,
  dashboard list + leave, dashboard claim) — full suite (169 specs) passes.
- Live-verified against a real running backend (H2, default profile) end
  to end: two real users, one exhausts all copies of a book, the other
  joins the waitlist, gets rejected on a duplicate join and on a
  copies-available book, gets promoted to `READY_FOR_PICKUP` (with stock
  staying at 0 — confirmed the copy is held, not returned to the pool)
  when the first user returns a copy, claims it into a real `Loan`, and a
  second reservation is confirmed cancellable while still `WAITING`.
  Also confirmed live in the browser (screenshots): the waitlist button,
  toast, badge states, and the Dashboard's waitlist section all render
  correctly against the real API.
- Renewals, late fees, subscription pause/annual billing, and Tamil
  localization remain the untouched product-backlog items from the PM
  review addendum; Cassandra/ES/OpenShift remain the untouched Appendix B
  infra items (ADR-015) — each still without a concrete consumer forcing
  the decision, so still deferred rather than spec'd here.
