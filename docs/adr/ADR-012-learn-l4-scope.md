# ADR-012: Suvadi Learn L4 — in-person classes (venues, batches, booking, waitlist, attendance)

## Status
Accepted (2026-07-07)

## Context
`docs/plans/learning-platform.md` scopes L4 as "Venue/batch scheduling,
seat booking with waitlist, attendance tracking", building on L1
(courses/enrollment) without depending on L2 (progress) or L3
(tests/certificates). Unlike those two phases, in-person batches are not a
property of an *enrollment* — a learner can book a batch for a course they
haven't (and may never) formally enroll in online, since the batch is the
delivery mechanism, not the course itself.

## Decision
1. **`batches`/`bookings` hang directly off `courses`, not `enrollments`.**
   There is no `source` column linking a booking back to an enrollment, and
   booking a batch never auto-creates an enrollment. This mirrors how a
   real classroom-training business works — someone can walk into a
   weekend class without ever touching the online syllabus — and keeps L4
   fully independent of L2/L3, so neither has to be re-opened.
2. **`instructor_name` stays a plain string column**, not a foreign key to
   `users`. `ADR-009` already deferred a first-class `INSTRUCTOR` role;
   introducing one now just to satisfy a batch-scheduling form would be
   scope creep with no consumer (nothing reads "which user taught this")
   until a real instructor-facing feature exists.
3. **`BookingService` depends on `BatchRepository` directly, not on
   `BatchService`.** The first draft routed `bookSeat`/`cancelBooking`
   through `BatchService.findBatchOrThrow` /
   `BatchService.requirePublished`, which would have required making
   `requirePublished` `public` (the same cross-package-test-visibility fix
   used twice before, in `LessonProgressService.buildProgress` and
   `TestService.findTestOrThrow`). Here the coupling itself was
   unnecessary — `BookingService` only ever needed a batch lookup, not
   `BatchService`'s admin CRUD surface — so `requirePublished` was deleted
   and `BookingService` got its own repository dependency instead. Same
   underlying problem, different fix, chosen because removing the
   coupling was strictly better than widening visibility to route around
   it.
4. **Capacity/waitlist is first-confirmed-first-served, promotion is
   FIFO by `bookedAt`.** `bookSeat` compares
   `countByBatchAndStatus(CONFIRMED)` against `capacity`: under capacity →
   `CONFIRMED`, at or over → `WAITLISTED`. Cancelling a `CONFIRMED`
   booking promotes `findByBatchAndStatusOrderByBookedAtAsc(WAITLISTED)`'s
   first entry and re-publishes `batch.booked` for the promoted learner;
   cancelling a `WAITLISTED` booking is a pure no-op for everyone else
   (nothing to backfill). Verified live end-to-end on a capacity-1 batch:
   learner1 books (CONFIRMED) → learner2 books (WAITLISTED) → learner1
   cancels → learner2 auto-promotes to CONFIRMED, both via curl and via
   the UI with two separate browser sessions.
5. **Batch browsing stays under the existing public `courses/**`
   permitAll rule — deliberately, this time with no new matcher.** L2 and
   L3 each found a real gap where a new authenticated-only endpoint got
   swept into that broad rule and needed a specific `authenticated()`
   matcher registered first. Batch listing is different: the plan
   explicitly wants prospective learners to browse upcoming in-person
   classes *before* signing in (same as the course catalog itself), so
   `GET /learn/courses/{id}/batches` is correctly public as-is. Booking,
   cancelling, and "my bookings" are all under paths outside that prefix
   (`/learn/batches/{id}/book`, `/learn/bookings/{id}`,
   `/learn/me/bookings`) and so already fall under the default
   `anyRequest().authenticated()` — no new matcher needed. Re-reading the
   plan's intent before touching `SecurityConfig` avoided adding an
   unnecessary restriction this time.
6. **`batch.booked` reuses `Topics.COURSE_EVENTS`, and this is the phase
   that finally adds a consumer.** Every prior Learn event
   (`course.enrolled`, `test.passed`) published to `COURSE_EVENTS` with no
   listener, per ADR-009's explicit "seed now, no consumer yet" call.
   `NotificationConsumer.onCourseEvent` is the first `@KafkaListener` on
   that topic, dispatching on `event.type()` to build a notification body
   for all three event types — activating previously-inert plumbing
   rather than adding a fourth kind of dead-letter event.
7. **Paid batches are rejected with the same deferral pattern as L1's
   paid-course enrollment.** `bookSeat` throws when `batch.getFee() >
   BigDecimal.ZERO`, with a "check back soon" message pointing at the
   not-yet-built payments phase (L5) — third reuse of this exact pattern
   in the series, kept consistent rather than inventing new copy.
8. **No scheduled reminder job in this branch.** The plan's L4 scope
   doesn't require `batch.reminder`, and this environment has no
   Docker/Kafka/Mailpit to verify a time-based scheduler actually fires
   and gets consumed — building it here would be unverified plumbing.
   Deferred, same reasoning as prior infra-dependent deferrals (e.g. the
   MinIO deferral in ADR-010).

## Consequences
- Backend: 87/87 tests pass (18 new: `VenueServiceTest`, `BatchServiceTest`,
  `BookingServiceTest`, plus 3 new `NotificationConsumerTest` cases for
  `onCourseEvent`), covering capacity/waitlist edge cases (confirms under
  capacity, waitlists at capacity, rejects duplicate/unpublished/paid
  bookings, promotes on cancellation, no-ops when the waitlist is empty,
  rejects the wrong user cancelling).
- Frontend: 147/147 e2e specs pass (11 new in `batches.spec.ts`), covering
  the learner batch panel (available/full/booked states), booking and
  waitlisting, the Dashboard bookings section with cancel, the admin
  Venues CRUD page, and the admin Batches dialog (schedule → publish →
  roster → attendance), plus WCAG 2.2 A/AA gates in both themes. One real
  accessibility gap was caught and fixed in review: the per-session date
  input in the batch-scheduling form had no accessible name (`type="date"`
  has no visible placeholder), fixed with `aria-label`.
- Verified live end-to-end against the real backend: venue creation →
  batch + sessions creation (DRAFT) → publish → public unauthenticated
  browsing shows correct seat counts → booking → waitlisting at capacity →
  duplicate-booking rejection → cancellation → waitlist promotion → admin
  roster view reflecting CONFIRMED/CANCELLED status → attendance marking
  → admin batch list showing updated confirmed/waitlisted counts — then
  the same flow again end-to-end through the browser UI (not just curl),
  including two concurrent learner sessions to exercise the waitlist
  promotion visually.
- L5 (payments) is the only remaining phase from the original plan; L4
  leaves it exactly where L1 left it — batches and courses both reject
  non-zero fees with the same "coming soon" message, so L5 has one
  consistent gate to remove in both places rather than two different ones.
