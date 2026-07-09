# ADR-022: Gift subscriptions

## Status
Accepted (2026-07-09)

## Context
Churn-reduction backlog item from the PM/principal-engineer review, and
the second item on the user's explicit priority order (referral credits
→ **gift subscriptions** → Tamil localization → B2B tier → backend/infra).
There was no way for a member to buy a plan for someone else.

## Decision
1. **A gift is a real purchase, unlike `subscribe()`.** Referral credits
   (ADR-021) and annual billing (ADR-020) both established that
   `SubscriptionService.subscribe()` has never charged anyone — it only
   ever activates a subscription record. A gift is different: the
   *purchaser* is spending real money on someone else's behalf, so it
   goes through the same fake `PaymentService`/`PaymentProvider` already
   used for paid course enrollment, batch booking, and late fees (a new
   `PaymentPurpose.GIFT_SUBSCRIPTION` value — `PaymentService.charge`
   needed zero other changes). The purchaser is charged the plan's full
   `BillingCycle.totalBilled(monthlyPrice)` — no member-plan discount
   (that discount, in `PaymentService.priceForUser`, is specific to
   course/batch fees, not subscription pricing).
2. **A `GiftSubscription` entity, not a special `Subscription` row.** The
   gift's own lifecycle (bought → redeemed) is a different concern from
   the redeemed *subscription's* lifecycle (active/paused/cancelled), so
   they're separate tables. `GiftSubscription` holds `purchaser`,
   `recipientEmail`, `plan`, `billingCycle`, a unique 8-character
   `giftCode` (same generation scheme as ADR-021's referral codes:
   UUID-slice, uppercased, retried against a uniqueness check),
   `amountPaid`, `status` (`PENDING`/`REDEEMED`), and `redeemedBy`/
   `redeemedAt` once claimed.
3. **The gift code is redeemable by anyone who has it — not locked to
   `recipientEmail`.** `recipientEmail` is captured only to (a) best-effort
   notify an already-registered recipient that a gift is waiting for
   them, and (b) show the purchaser who each gift in their "sent" list
   was for. Redemption itself just checks the code, mirroring how a
   referral code or a real-world gift card works: whoever has the code
   can use it. This avoids fragile email-matching edge cases (recipient
   signs up with a different address than the one the purchaser typed).
4. **Two redemption paths**, because the recipient may or may not have
   an account yet:
   - **Already a member**: `POST /gifts/redeem` while signed in. An
     unknown or already-redeemed code is a **real error** here (unlike a
     referral code) — redeeming is the entire point of the action, so
     failing silently would hide a real problem from the one person who
     needs to know about it.
   - **Brand new recipient**: `RegisterRequest` gains an optional
     `giftCode` field, mirroring `referralCode`. A valid, unredeemed code
     activates the gifted plan *instead of* the usual auto-assigned
     BASIC subscription; an unknown, malformed, or already-redeemed code
     is **silently ignored** (registration still succeeds with the
     normal BASIC plan) — same rationale as an unknown referral code: a
     typo shouldn't block someone from signing up.
5. **Redeeming reuses `subscribe()`'s cancel-and-replace logic**, refactored
   out of `SubscriptionService.subscribe()` into a private
   `replaceActiveSubscription(user, plan, billingCycle)` helper, exposed
   for gifts via a new public `activateGiftedPlan(User, SubscriptionPlan,
   BillingCycle)`. Both paths cancel any existing non-terminal
   subscription and start a fresh one; `activateGiftedPlan` never spends
   the recipient's own referral credit (the gift already covered the
   cost) — `SubscriptionResponse.from(sub)` with no credit argument, so
   `creditApplied` is always zero on a gift redemption.
   `SubscriptionService.priceFor(SubscriptionPlan)` was pulled out as the
   single source of truth for plan sticker prices (previously inlined in
   `subscribe()`), reused by `GiftService.purchase()` to compute the
   charge amount — one place to change if prices ever move.
6. **A new `GiftService`**, separate from `SubscriptionService`, mirroring
   how `EnrollmentService`/`BookingService` sit apart from
   `PaymentService`: it owns the purchase/redeem lifecycle and the
   `GiftSubscription` repository, and calls into `SubscriptionService`
   and `PaymentService` rather than duplicating their logic.
7. **`Topics.USER_EVENTS` (from ADR-021) gains two more event types**
   rather than a new topic — `gift.received` (best-effort: only fires if
   `recipientEmail` matches an existing registered user) and
   `gift.redeemed` (notifies the purchaser their gift was claimed) — both
   are account-adjacent events, the same category referral credits
   already used this topic for.
8. **Frontend**: a single `/gift` route with a "Send a gift" / "Redeem a
   gift" tab toggle (reusing the existing `Tabs` component, same pattern
   as the Plans page's billing-cycle toggle) rather than two separate
   routes — sending and redeeming are two sides of the same feature and
   a recipient redeeming an existing account's gift benefits from seeing
   both in one place. Sending reuses the existing `CheckoutDialog` (the
   same fake-card checkout as paid courses/batches) and, on success,
   shows the code plus a copyable `?gift=CODE` link (mirroring ADR-021's
   `?ref=CODE` pattern on Register). The Register page gets a second
   optional "Gift code" field alongside "Referral code" — the two are
   independent and can both be present on the same signup.

## Consequences
- Backend: full `mvn test` suite passes — new `GiftServiceTest` (12
  cases: purchase success/decline/notify-if-registered, redeem
  success/unknown/already-redeemed, register-time redeem
  valid/unknown/already-redeemed/blank) and new `AuthServiceTest` case
  (`register_withValidGiftCode_activatesGiftedPlanInsteadOfBasic`).
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass.
- e2e: 9 new Playwright specs (`e2e/specs/gift-subscriptions.spec.ts`) —
  auth-gating, the Send/Redeem tabs, purchasing and seeing the resulting
  code, the sent-gifts list, redeeming (success and failure), the
  Register page's `?gift=` prefill and API payload, and a11y. Full suite
  (206 specs) passes with no regressions (one unrelated pre-existing
  flake in `navigation.spec.ts`'s skip-link focus test, confirmed to
  pass in isolation).
- Live-verified against a real running backend: purchased a
  Premium/Annual gift for an already-registered member (charged the
  correct ₹3990 = 10× monthly), redeemed it while signed in as that
  member (their prior Basic subscription was replaced, `creditApplied:
  0`), confirmed a second redemption attempt on the same code is
  rejected; purchased a Basic/Monthly gift for an email with no account
  yet, then registered that email with the gift code and confirmed the
  gifted plan was activated instead of the default Basic; registered a
  separate account with an unknown gift code and confirmed registration
  still succeeded normally. Verified visually in the browser: the Send
  tab (plans, billing toggle, gifts-sent history with correct
  Pending/Redeemed badges), the Redeem tab, and the Register page
  showing both the Referral code and Gift code fields with the gift
  code prefilled from a `?gift=` link.
- Tamil localization, the B2B tier, and the Appendix B infra items
  remain the next items in the user's stated priority order, still
  untouched. The Family plan's real sub-account mechanics (a separate,
  larger backlog item) also remain untouched — gifting an individual
  plan to one recipient is a different, simpler mechanic.
