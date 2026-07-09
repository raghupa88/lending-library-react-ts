# ADR-020: Annual billing at a discount

## Status
Accepted (2026-07-09)

## Context
Churn-reduction backlog item from the PM/principal-engineer review:
"annual billing at a discount." Every subscription up to this point was
implicitly monthly with no alternative cadence.

## Decision
1. **A new `BillingCycle` enum (`MONTHLY`/`ANNUAL`)** on `Subscription`,
   not a separate "annual plan" duplicating each existing plan — a plan
   (Basic/Premium) and a billing cycle (monthly/annual) are orthogonal,
   so modeling them as two independent fields avoids a combinatorial
   explosion of plan variants as more plans or cycles are added later.
2. **Annual bills exactly 10x the monthly rate — "2 months free"**,
   computed via `BillingCycle.totalBilled(monthlyPrice)` rather than an
   arbitrary percentage. This is a clean, easily-explained discount frame
   or a real subscription business, and it means the discount lives in
   one place (the enum method) rather than being duplicated as a magic
   percentage in the price list, the confirm dialog, and the plans page.
3. **No real billing/charging exists for subscriptions today, and this
   branch doesn't add it.** Confirmed by inspection: `subscribe()` has
   never called `PaymentService` — subscriptions have always been
   activated, not actually charged, even for the existing monthly cycle.
   Retrofitting real payment collection onto subscriptions (a
   significantly larger, separate decision — recurring billing, a stored
   payment method, invoicing) is out of scope for "add an annual cycle
   option" and would be speculative complexity beyond what was asked.
   `totalBilled` is a display/audit value for now, consistent with how
   `monthlyPrice` already worked.
4. **`SubscriptionRequest.billingCycle` defaults to `MONTHLY` when
   omitted** (compact constructor null-check) rather than being strictly
   required, so every existing caller of `POST /subscriptions` that
   predates this branch keeps working unchanged.
5. **Frontend**: a `Monthly`/`Annual` toggle on the Plans page (reusing
   the existing `Tabs` component rather than building a new segmented
   control), recomputing each plan card's displayed price and the
   confirm dialog's total in place — no new page or route.

## Consequences
- Backend: 144/144 unit tests pass (`mvn test`) — new
  `subscribe_annualBillingCycle_billsTenTimesMonthlyRate` and
  `subscribe_omittedBillingCycle_defaultsToMonthly` cases in
  `SubscriptionServiceTest`.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass. Plans page gets the billing-cycle toggle and
  savings note; Dashboard's plan card shows the yearly total when on
  annual billing.
- e2e: 3 new Playwright specs (`e2e/specs/annual-billing.spec.ts`) —
  toggle updates displayed prices, confirm dialog shows the annual total,
  Dashboard reflects an annual subscription. Full suite (182 specs)
  passes.
- Live-verified against a real running backend: `GET /subscriptions/plans`
  returns the correct `annualPrice` (10x) for both plans; subscribing
  with `billingCycle: "ANNUAL"` persists and returns the correct
  `totalBilled`; omitting `billingCycle` entirely still defaults to
  monthly, confirming backward compatibility. Verified visually in the
  browser: the toggle, the "Pay for 10 months, get 12" note, the
  discounted per-plan prices, and the confirm dialog's annual total.
- Referral credits, gift subscriptions, and the Family plan's real
  sub-account mechanics remain the untouched churn-reduction backlog
  items; Tamil localization, B2B tier, and the Appendix B infra items
  remain untouched as larger, separately-scoped efforts.
