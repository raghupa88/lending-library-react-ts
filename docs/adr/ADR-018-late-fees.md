# ADR-018: Late fees

## Status
Accepted (2026-07-08)

## Context
Backlog item #3 from the PM/principal-engineer review, originally scoped
as "Late fees & lost-book charges — operational necessity and a revenue
stream; compute on return of overdue loans, record via existing Order
entity. (Backlog, with payments phase.)" The "(Backlog, with payments
phase)" note meant this waited until a real payment path existed —
Suvadi Learn L5 (ADR-013) since built `PaymentService`/`PaymentProvider`/
`Payment`, so this is that deferred slice.

The `Order` entity referenced in the original note has existed since the
very first migration (`user`, `totalAmount`, `status`, `notes`,
timestamps) but had zero consumers anywhere in the app — `POST /orders`
existed but nothing ever called it, and no frontend page referenced
`/orders` at all. This branch is what finally gives it a job.

## Decision
1. **A late fee is recorded as a `PENDING` `Order`, not auto-charged.**
   There's no stored payment method anywhere in this app — every existing
   charge (course enrollment, batch booking) collects fresh card details
   at the moment of checkout via `PaymentInput`. Returning a book happens
   with no such moment, so there's nothing to auto-bill against. The fee
   is recorded as a debt owed (`Order`, `status=PENDING`) and the member
   pays it off afterward through the same `PaymentInput`-driven checkout
   flow already used elsewhere — reusing `CheckoutDialog` verbatim rather
   than inventing a second checkout UI.
2. **Whole calendar days, not elapsed time**
   (`ChronoUnit.DAYS.between(dueDate.toLocalDate(), returnedAt.toLocalDate())`)
   — returning a few hours late on the due date itself doesn't count as a
   day overdue, only a genuinely later calendar day does.
3. **Capped at the book's own `purchasePrice`.** A per-day fee
   (`late-fees.per-day-amount`, default ₹10) accumulates uncapped in the
   original PM note ("late fees & lost-book charges" bundled as one line
   item), so capping the fee at what the book itself costs to replace is
   the natural ceiling that unifies both halves of that line without
   building a separate "declare this copy lost" flow — a badly overdue
   paperback never costs more than buying a new one outright.
4. **`LoanService` gained a new dependency on `OrderRepository`** (not
   `OrderService` — no need for its `create`/`pay` methods here, just a
   direct save) to record the fee inside the same transaction as the
   return itself. `OrderService` gained a `pay(orderId, email, input)`
   method mirroring `EnrollmentService`/`BookingService`'s existing
   declined-payment handling: a decline leaves the order `PENDING` (so
   the member can retry) rather than failing it outright.
5. **`LoanResponse` carries `lateFeeOrderId`/`lateFeeAmount`, both null
   except on the specific return that incurred a fee** — an overloaded
   `LoanResponse.from(Loan, UUID, BigDecimal)` alongside the existing
   `from(Loan)`, rather than a wrapper response type, so the Dashboard's
   existing return-mutation success handler can act on it directly
   without a second round-trip.
6. **`PaymentPurpose.LATE_FEE`** is a third purpose alongside the L5
   enrollment/booking ones; `PaymentService.charge` itself needed no
   changes — this is exactly the extensibility that enum was already
   built for.
7. **Frontend**: an "outstanding late fee" banner near the top of the
   Dashboard (visible regardless of which tab is active, since it's
   money owed rather than a browsing concern) plus a `Pay now` action in
   the return-success toast, both opening the same `CheckoutDialog` used
   by Suvadi Learn checkout — no new payment UI was written.

## Consequences
- Backend: 134/134 unit tests pass (`mvn test`) — 4 new late-fee cases in
  `LoanServiceTest` (on-time no-fee, on-due-date-exactly no-fee, uncapped
  overdue fee, capped-at-purchase-price fee) and a new `OrderServiceTest`
  (pay success, decline leaves order pending, already-completed rejected,
  wrong-user rejected).
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass. New `src/features/orders/queries.ts`;
  Dashboard wired with the banner, toast action, and `CheckoutDialog`
  reuse.
- e2e: 4 new Playwright specs (`e2e/specs/late-fees.spec.ts`) — toast +
  dialog on overdue return, successful payment, declined payment keeps
  the dialog open, and the standalone outstanding-fees banner. Full suite
  (176 specs, 1 known-flaky unrelated skip/rerun) passes.
- Live-verified against a real running backend end to end, including the
  one thing unit tests with mocks can't prove — actual Postgres/H2-backed
  `Order` persistence and a real (fake-provider) charge: backdated a
  seeded loan's `due_date` directly via the H2 console to simulate
  "2 days overdue" (no admin backdating endpoint exists, nor should one),
  returned it via the real API, confirmed a `PENDING` order for ₹9.99
  (correctly capped — 2 × ₹10 would have been ₹20, but the book's
  purchase price is ₹9.99), confirmed a declined card leaves it
  `PENDING`, confirmed a valid card marks it `COMPLETED`, and confirmed a
  second payment attempt is rejected. Also confirmed a same-day return
  incurs zero fee. Verified visually in the browser: the return toast
  ("Returned "Ponniyin Selvan" — this was overdue, so a ₹14.99 late fee
  was added.") with its `Pay now` action, and the resulting
  `CheckoutDialog` showing the correct amount.
- Remaining PM-review backlog items (subscription pause/annual billing,
  Tamil localization, B2B tier) and Appendix B infra items (Cassandra,
  ES/Kibana, OpenShift) are still untouched.
