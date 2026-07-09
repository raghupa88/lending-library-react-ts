# ADR-021: Referral credits

## Status
Accepted (2026-07-09)

## Context
Churn-reduction backlog item from the PM/principal-engineer review, and
the first item on the user's explicit priority order (referral credits
→ gift subscriptions → Tamil localization → B2B tier → backend/infra):
"referral credits." There was no mechanism for a member to invite
another and be rewarded for it.

## Decision
1. **Every registered user gets a unique, shareable 8-character
   `referralCode`** (`User.referralCode`, generated from a UUID slice,
   uppercased, retried up to 5 times against a uniqueness check — the
   collision odds are astronomically low, but the retry loop costs
   nothing and avoids ever surfacing a raw constraint violation to a
   registering user). A new registrant may optionally supply someone
   else's code at signup (`RegisterRequest.referralCode`).
2. **The referrer is credited, not the new signup** — a fixed
   `REFERRAL_CREDIT_AMOUNT` (₹100.00) is added to `referredBy`'s
   `referralCreditBalance` the moment registration succeeds. There is no
   separate "free tier → paid conversion" moment to wait for: every new
   user is auto-subscribed to BASIC immediately at registration (existing
   `AuthService.register()` behavior), so crediting at registration time
   is the natural, earliest correct moment.
3. **An unknown or malformed code is silently ignored — registration
   still succeeds.** A typo in a shared referral link is a UX failure,
   not a validation failure; rejecting the whole signup over it would be
   needlessly punitive. This is stated directly in a Javadoc comment on
   the field so the intent survives future edits.
4. **Credit is spent automatically at the referrer's next `subscribe()`
   call, capped at that bill's `totalBilled`.** Any balance left over
   (credit exceeds the bill, or there's no subscribe yet) simply carries
   forward — it's a persisted balance on `User`, not a one-shot coupon.
   This mirrors an ordinary store-credit/wallet semantic and needs no
   expiry or usage-tracking machinery beyond the balance itself.
5. **No real billing/charging exists for subscriptions today, and this
   branch doesn't add it** (same pre-existing fact established in
   ADR-020: `subscribe()` has never called `PaymentService`).
   `creditApplied` and the reduced `totalBilled` remain display/audit
   values — applying credit decrements the real persisted
   `referralCreditBalance`, but doesn't collect or refund an actual
   payment, consistent with how `totalBilled` already worked before this
   branch. Retrofitting real payment collection remains explicitly out
   of scope.
6. **`SubscriptionResponse` gains a `creditApplied` field via a second
   `from(Subscription, BigDecimal)` factory** (the existing
   `LoanResponse.from(Loan, UUID, BigDecimal)` overload pattern from
   ADR-018) — only the specific `subscribe()` response that actually
   spent credit shows a non-zero value; `getCurrent`/`pause`/`resume`
   always show the full, undiscounted total, since those aren't a
   "spend credit" moment.
7. **`SubscriptionService` takes a direct `UserRepository` dependency**
   (not routed through `UserService`, which exposes no generic `save`) —
   same "adjacent aggregate, simple repo op" reasoning as the
   `LoanService`→`OrderRepository` precedent from ADR-018.
8. **A new `Topics.USER_EVENTS` Kafka topic** (`library.user.events`) —
   none of the existing topics (loan/subscription/book/course/payment)
   semantically fit a referral/account event. `NotificationConsumer`
   gets a new listener notifying the referrer by email/in-app when
   their credit lands.
9. **Frontend**: an optional "Referral code" field on Register,
   prefillable via a `?ref=CODE` query param (mirroring the existing
   `?returnTo=` pattern) so a shared link can carry the code
   automatically; a "Referrals" card on Profile showing the member's own
   code with a copy-link affordance and current balance; the Plans page
   success toast mentions the credit applied when `creditApplied > 0`.

## Consequences
- Backend: full `mvn test` suite passes — new
  `register_withValidReferralCode_creditsReferrerAndLinksUser` and
  `register_withUnknownReferralCode_stillSucceeds_noCreditGranted` cases
  in `AuthServiceTest`, and
  `subscribe_partialReferralCredit_reducesTotalBilledAndCarriesRemainderToZero`,
  `subscribe_creditFullyCoversBill_totalBilledZeroAndRemainderCarriesOver`,
  `subscribe_noCreditBalance_totalBilledUnchangedAndNoUserSave` in
  `SubscriptionServiceTest`.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass.
- e2e: 6 new Playwright specs (`e2e/specs/referral-credits.spec.ts`) —
  `?ref=` prefill, the code reaching the register API call, the
  Referrals card rendering code/balance, the copy-link toast, and the
  Plans success toast mentioning applied credit. Full suite (188 specs)
  passes with no regressions.
- Live-verified against a real running backend: registering a referrer,
  then registering a second user with that code (lowercase, to confirm
  the trim/uppercase normalization), correctly credited the referrer
  ₹100; subscribing the referrer to Basic/Monthly (₹199) applied the
  full ₹100 credit, returned `totalBilled: 99, creditApplied: 100`, and
  zeroed the balance; a subsequent `GET /subscriptions/current` showed
  the full ₹199 total with `creditApplied: 0`, confirming the
  display-only, per-response nature of the discount; registering with an
  unknown code still succeeded with no error. Verified visually in the
  browser: the register page's referral field prefilled from a `?ref=`
  link, and the Profile page's Referrals card showing the code, a
  working copy-link button, and the ₹100.00 balance.
- Gift subscriptions, Tamil localization, the B2B tier, and the
  Appendix B infra items remain the next items in the user's stated
  priority order, still untouched.
