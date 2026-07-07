# ADR-013: Suvadi Learn L5 — payments (fake provider, paid enrollment/batch fees)

## Status
Accepted (2026-07-07)

## Context
`docs/plans/learning-platform.md` scopes L5 as "Paid enrollment/batch fees
via provider port, member-plan discounts", verified by a "fake-provider
checkout e2e incl. failure path." L1 and L4 both deliberately deferred
paid courses/batches to this phase with matching "check back soon"
rejections; this phase removes both gates behind a real (if fake) charge.
No prior ADR defines a payment entity or provider — a repo-wide check
found only a reserved, never-produced `PAYMENT_EVENTS` Kafka topic and a
generic, effectively-dead `Order` entity from the original book-purchase
scaffolding (no line items, nothing ever transitions it out of `PENDING`).
Neither was reused: `Order` has no shape for "what was paid for" beyond a
free-text `notes` field, and building a `Payment` record purpose-built for
enrollment/booking audit was cleaner than overloading it.

## Decision
1. **`PaymentProvider` is a two-method port — `charge(ChargeRequest):
   ChargeResult` — with exactly one implementation, `FakePaymentProvider`.**
   No real gateway integration exists or is planned for this demo; the
   port exists so a future Razorpay-test-mode adapter (mentioned in the
   plan) would implement the same interface with zero changes to
   `PaymentService` or its callers. The fake decline trigger deliberately
   reuses Stripe's well-known "always declined" test card number
   (`4000000000000002`) rather than an ad-hoc magic value, so the same
   documented number drives the backend unit test, the e2e failure-path
   spec, and the live-smoke declined-payment check.
2. **A charge always writes an audit `Payment` row — success or
   failure — in its own transaction (`Propagation.REQUIRES_NEW`).**
   `EnrollmentService.enroll`/`BookingService.bookSeat` call
   `paymentService.charge(...)` and then throw a `BusinessException` when
   the charge fails. Since `BusinessException` is a `RuntimeException`,
   the caller's own `@Transactional` method rolls back on that throw —
   which would silently erase the very audit record proving the decline
   happened, if `charge` shared that transaction. Running the charge in
   `REQUIRES_NEW` makes the `Payment` row (and its `payment.succeeded` /
   `payment.failed` event, the first-ever producer onto the previously
   inert `PAYMENT_EVENTS` topic) commit independently and survive the
   caller's rollback — the correct behavior for any payment audit trail.
3. **`amountPaid` lands on `Enrollment`/`Booking` directly (a new nullable-
   free `NUMERIC(10,2) DEFAULT 0` column on each), not just on `Payment`.**
   The common read path ("what did this learner pay for this
   enrollment/booking") shouldn't require a join back through
   `Payment.referenceId`; the `Payment` table remains the append-only
   audit log (including every failed attempt), while the two "did it
   happen and for how much" columns stay cheap to read on the resource
   itself.
4. **Member-plan discounts apply to course/batch fees, not to the
   subscription's own price.** `PaymentService.priceForUser` looks up the
   caller's active `Subscription` and applies a flat discount by plan
   (`PREMIUM` 15%, `BASIC`/`ADMIN` 0%, no active subscription 0%) before
   any charge — verified live end-to-end: a ₹1000 course charged a Premium
   subscriber exactly ₹850.00, and a ₹500 batch fee charged exactly
   ₹425.00. A price of exactly zero short-circuits before the
   subscription lookup, since a free course/batch needs no discount
   calculation and no payment step at all — this also keeps every
   existing free-enrollment/free-booking test passing unchanged (they
   never reach the payment gate).
5. **Paid batches cannot be waitlisted.** `bookSeat` still computes
   `CONFIRMED` vs. `WAITLISTED` from capacity exactly as in L4, but when
   the fee is non-zero and the batch is already full, it rejects the
   booking outright ("paid batches can't be waitlisted yet") instead of
   charging for a seat that isn't guaranteed. Charging into a waitlist
   would need a hold-and-capture-on-promotion flow (authorize now, charge
   only if a seat opens, refund if it never does) — real work with a real
   failure surface this phase doesn't build. Free batches keep their
   existing L4 waitlist behavior untouched.
6. **The checkout dialog is one shared component for both flows**
   (`src/components/payments/CheckoutDialog.tsx`), parameterized by title
   and amount, used from the one page (`LearnDetail`) that has both a
   paid-course "Enroll" button and a paid-batch "Book a seat" button. A
   free course/batch still enrolls/books instantly with no dialog — the
   dialog only appears when there's actually a charge to make, so the
   existing free-path UX (and its passing e2e specs) is untouched.
7. **The success toast shows the amount actually charged, not the sticker
   price**, since the dialog only knows the base fee/price up front (there
   is no "preview the discount" endpoint) while the backend's response
   carries the true post-discount `amountPaid`. Showing the real charged
   figure after the fact was simpler and more honest than adding a preview
   round-trip just to display a number before commit.
8. **No scheduled retry, refund flow, or receipt email in this phase.**
   The plan's L5 bar is a provider port with a failure path, not a full
   billing system; refunds, retries, and receipts are out of scope here,
   consistent with the project's recurring pattern of deferring
   infra-dependent or unverified complexity (e.g. ADR-010's MinIO
   deferral, ADR-012's reminder-email deferral) rather than building
   plumbing nothing exercises yet.

## Consequences
- Backend: 101/101 tests pass (14 new: `PaymentServiceTest` covering the
  discount table and both charge outcomes, `FakePaymentProviderTest`
  covering the deterministic decline card, plus rewritten/added cases in
  `EnrollmentServiceTest` and `BookingServiceTest` for the
  missing-payment, declined-payment, and successful-paid-charge paths).
- Frontend: 158/158 e2e specs pass (11 new in `payments.spec.ts`),
  covering the paid-price-on-button state, client-side card validation,
  a successful charge closing the dialog with the right toast, a declined
  charge keeping the dialog open with an inline error, the
  missing-payment-details server message, the unauthenticated redirect
  happening before checkout ever opens, the full-paid-batch "no waitlist"
  UI state, and WCAG 2.2 A/AA gates on the checkout dialog in both themes.
- Verified live end-to-end against the real backend, through the actual
  browser UI (not just curl): a paid course rejects enrollment without
  card details, rejects the Stripe test decline card with the right
  message, and accepts a valid test card, correctly charging the
  Premium-discounted amount; a paid batch behaves identically and
  additionally rejects booking once full instead of silently waitlisting
  a charge.
- L6 (analytics & polish) is the only remaining phase in the original
  learning-platform plan; every prior phase's "paid X isn't available
  yet" gate is now gone, replaced by one consistent charge-or-reject path
  shared by courses and batches.
