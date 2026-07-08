# ADR-019: Subscription pause

## Status
Accepted (2026-07-08)

## Context
Backlog item from the PM/principal-engineer review's churn-reduction list:
"subscription pause (1 month)... Family plan needs actual sub-account
mechanics" (the sub-account part is a separate, larger feature and stays
deferred). A member travelling or between books today has only one
option — cancel outright and lose their plan, or keep paying for a plan
they aren't using. Pausing gives a middle option.

## Decision
1. **A new `SubscriptionStatus.PAUSED`**, not a boolean flag on top of
   `ACTIVE` — the existing status field already gates every lookup
   (`findByUserAndStatus(..., ACTIVE)`), so a fourth status value composes
   with that existing machinery instead of requiring a second check
   everywhere.
2. **Pausing suspends the plan's perks rather than blocking borrowing
   outright.** `LoanService.borrow`'s loan-limit lookup already falls
   back to `3` when `findByUserAndStatus(user, ACTIVE)` finds nothing —
   the same default an unsubscribed member gets. A paused Premium member
   drops from unlimited to that base default rather than losing all
   borrowing access, which needed zero changes to `LoanService` — the
   existing fallback already does the right thing once the subscription
   simply isn't `ACTIVE` anymore.
3. **Fixed one month, auto-resuming** — `pausedUntil` is set on pause and
   an hourly `@Scheduled` sweep (`resumeExpiredPauses`, no `@Profile`
   guard, same pattern as the reservation-hold expiry sweep in ADR-016)
   flips any subscription whose pause has elapsed back to `ACTIVE`. Early
   resume is a separate explicit action (`POST /subscriptions/resume`)
   rather than making members wait out the month if their trip ends
   early.
4. **`getCurrent` and `subscribe`'s "cancel the existing one" step both
   treat `ACTIVE` and `PAUSED` as the one non-terminal subscription** —
   before this branch, `getCurrent` only ever looked up `ACTIVE`, so a
   paused subscription would have 404'd as if the member had never
   subscribed (losing the Dashboard's ability to show "paused until X" at
   all), and `subscribe`'s cleanup step would have left a paused row
   dangling forever alongside a brand new active one if a member switched
   plans mid-pause. Both were widened to `findByUserAndStatusIn(user,
   [ACTIVE, PAUSED])` — confirmed live: switching plans while paused
   correctly cancels the paused row rather than leaving two live rows.
5. **`NotificationConsumer.notifyForSubscriptionEvent`** gained a
   `switch` on `event.type()` (paused/resumed/default) — previously the
   handler unconditionally worded every subscription event as "You're now
   on the X plan," which would have produced a nonsensical notification
   for a pause/resume event.

## Consequences
- Backend: 142/142 unit tests pass (`mvn test`) — new
  `SubscriptionServiceTest` covering `getCurrent` (active-or-paused,
  none-found), `subscribe` (cancels an existing paused row), `pause`
  (success, no-active-subscription), `resume` (success, not-paused), and
  the expiry sweep.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass. Dashboard's "Your plan" card gained a
  `Paused` badge, a "Pause a month" / "Resume now" action pair, and
  "Paused until X" copy — no new page, same card.
- e2e: 3 new Playwright specs
  (`e2e/specs/subscription-pause.spec.ts`) — pause toast, paused-state
  card contents (badge, copy, Resume button, Change-plan/Pause hidden),
  resume toast. Full suite (179 specs) passes.
- Live-verified against a real running backend end to end: subscribe →
  pause (confirmed `pausedUntil` exactly one month out) → double-pause
  correctly rejected → resume → double-resume correctly rejected → pause
  again → switch plans while paused (confirmed the old paused row is
  cancelled, not left dangling, and only the new plan shows as current).
  Verified visually in the browser: the paused-state card and toast.
- Referral credits, gift subscriptions, annual billing, and the Family
  plan's actual sub-account mechanics remain the untouched churn-reduction
  backlog items; Tamil localization and B2B tier remain untouched as
  larger, separately-scoped efforts.
