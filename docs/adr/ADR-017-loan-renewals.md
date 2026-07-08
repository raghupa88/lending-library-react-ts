# ADR-017: Loan renewals

## Status
Accepted (2026-07-08)

## Context
Backlog item #2 from the PM/principal-engineer review: members could
return a book or let it go overdue, but had no way to simply keep reading
it a little longer without a reservation existing for someone else.

## Decision
1. **One renewal per loan, tracked as a plain boolean.** `Loan.renewed`
   (new column, `V12__loan_renewals.sql`) flips to `true` on first use;
   a second `PUT /api/v1/loans/{id}/renew` is rejected outright rather
   than silently no-op'ing or stacking extensions — a real library's
   "renew once" rule, made explicit rather than inferred from a count.
2. **Extension is 14 days from the later of the current due date or
   now.** Renewing before the due date extends from the existing due
   date (so renewing early doesn't cost you the remaining days); renewing
   an already-overdue loan extends from the moment of renewal instead of
   compounding onto a past date that would otherwise still land in the
   past. No cap beyond the one-renewal rule was requested, so none was
   added.
3. **Blocked whenever the book has an active reservation queue** —
   `ReservationService.hasActiveQueue(book)` (checks for any `WAITING` or
   `READY_FOR_PICKUP` reservation) rather than just checking
   `availableCopies`. Renewing never touches stock either way (the
   member already has the physical copy), so the usual "no copies left"
   signal doesn't apply here — the real conflict is a queued reader
   waiting their turn, which extending the current holder's due date
   would stall further. This is the same `ReservationRepository` used by
   book-reservations (ADR-016); `existsByBookAndStatusIn` was added
   there for this exact check rather than fetching and measuring a list.
4. **`loan.renewed` reuses the existing `LOAN_EVENTS` topic and
   `NotificationConsumer.notifyForLoanEvent`** (extended with a third
   branch) rather than adding a new topic or consumer method — same
   payload shape as `loan.created`/`loan.returned` already carry.
5. **Frontend**: a `Renew` button next to `Return` in the Dashboard's
   "Currently reading" list; once `loan.renewed` is `true` the button is
   replaced with a `Renewed` badge (matching the "one PR reservation" UX
   precedent of showing state instead of a disabled control with no
   explanation). Server-side rejections (already renewed, active
   waitlist) surface via the existing toast pattern with the backend's
   own message — no separate client-side prediction of the waitlist
   block, since the Dashboard doesn't have visibility into other users'
   reservations for a book it doesn't own the record for.

## Consequences
- Backend: 127/127 unit tests pass (`mvn test`) — 6 new `renew` cases in
  `LoanServiceTest` plus 2 new `hasActiveQueue` cases in
  `ReservationServiceTest`.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass. New `useRenewLoan` mutation; Dashboard wired
  with a Renew action and Renewed badge.
- e2e: 3 new Playwright specs (`e2e/specs/loan-renewals.spec.ts`) —
  success toast, waitlist-blocked error surfaced verbatim, and the
  Renewed-badge state. Full suite (172 specs) passes.
- Live-verified against a real running backend end to end: renew extends
  a due date by exactly 14 days from the original due date and flips
  `renewed` to `true`; a second renewal attempt on the same loan is
  rejected; renewing succeeds normally when no one is queued; and — with
  a book's last copy borrowed and a second member's waitlist join
  confirmed — the original holder's renewal attempt on that same book is
  correctly rejected with "Can't renew — someone else is waiting for
  this book".
- Remaining PM-review backlog items (late fees, subscription pause/annual
  billing, Tamil localization, B2B tier) and Appendix B infra items
  (Cassandra, ES/Kibana, OpenShift) are still untouched, each still
  without a forcing concrete-consumer reason to pick over the others.
