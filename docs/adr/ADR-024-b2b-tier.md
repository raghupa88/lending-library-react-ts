# ADR-024: B2B tier (schools & corporate bulk memberships)

## Status
Accepted (2026-07-09)

## Context
Fourth item on the user's explicit priority order (referral credits →
gift subscriptions → Tamil localization phase 1 → **B2B tier** →
backend/infra), and one of two vaguer backlog items from the
PM/principal-engineer review (the other, gift subscriptions, already
shipped): "B2B tier (schools/corporate bulk memberships) — future
revenue line; keep plan model extensible (plans as DB rows, not
enum-only)." Unlike referral credits or gift subscriptions, this
backlog note had no accompanying screens or flows — the scope below is
this session's own design, not a pre-specified spec.

## Decision
1. **A seat-block purchase, mirroring gift subscriptions' "real
   purchase" precedent.** An org owner buys N seats of a plan for their
   school/company, paying the full amount now via the same fake
   `PaymentService`/`PaymentProvider` gift subscriptions and paid
   courses already use (a new `PaymentPurpose.ORGANIZATION_SEATS` —
   `PaymentService.charge` needed no other changes). The charge is
   `BillingCycle.totalBilled(priceFor(plan)) × seatCount` — the seat
   count is a simple multiplier on the same per-seat pricing individual
   members already pay, not a separate negotiated B2B price list (no
   such pricing was specified, and inventing one would be speculative).
2. **Two entities, not one**: `Organization` (name, owner, plan,
   billingCycle, seatsTotal, seatsUsed, a unique shareable joinCode,
   amountPaid) and `OrganizationMember` (a join row: organization, user,
   joinedAt). Membership is its own row rather than a flag on `User`
   because "who's in this org and when they joined" is exactly the
   kind of has-many relationship a join table represents, and it keeps
   `Organization` itself simple to reason about (a value-ish record of
   what was bought) separately from the roster (who's using it).
3. **A user owns at most one organization, and belongs to at most one
   organization as a member** — both enforced by unique constraints
   (`idx_organizations_owner`, `idx_org_members_user`) rather than
   allowing multiple. Nothing in the backlog note called for a user
   running multiple business accounts or being on two employers' plans
   simultaneously, and allowing either would raise real ambiguity (which
   org's plan wins if you're in two?) for no requested benefit — this
   is a deliberate scope cut, not an oversight.
4. **The join code is a single shared code with a seat counter**, not
   one code per seat. `seatsUsed` increments on each join and the code
   simply stops working once `seatsUsed == seatsTotal` — this mirrors
   how a real corporate/school signup code usually works (one code
   circulated internally, capacity-capped) and needed no new
   code-inventory data structure beyond the counter already on
   `Organization`. The code generation itself reuses the exact scheme
   from referral and gift codes (UUID-slice, uppercased, retried against
   a uniqueness check).
5. **Joining reuses `SubscriptionService.activateGiftedPlan`** (from
   ADR-022) rather than introducing a third near-identical "activate a
   plan someone else arranged" method — gift redemption and org joining
   are the same underlying operation (cancel-existing-and-activate,
   without touching the member's own referral credit) from
   `SubscriptionService`'s point of view; only the caller and its
   bookkeeping differ.
6. **Two join paths, same asymmetry as gift codes (ADR-022)**: joining
   while already signed in (`POST /organizations/join`) treats an
   unknown/full/already-a-member code as a real error, since joining is
   the explicit point of that action; joining as part of registration
   (`RegisterRequest.orgCode`, checked after `giftCode` so a personal
   gift wins if someone improbably has both) silently ignores an
   invalid code so a typo never blocks signup.
7. **Removing a member cancels their subscription outright rather than
   reverting them to BASIC.** A new `SubscriptionService
   .cancelActiveSubscription(User)` was added (the cancel-half of
   `replaceActiveSubscription` with no replacement) — someone removed
   from a corporate plan shouldn't be silently auto-billed for a
   personal Basic plan they never chose; they'd need to subscribe again
   themselves if they want to keep borrowing. No confirmation dialog was
   added for the remove action, matching the existing precedent of
   Cancel-booking/Cancel-reservation elsewhere in this app, which are
   also direct, undialogged actions.
8. **Frontend**: a single `/organization` page that branches on whether
   `GET /organizations/mine` returns a business account: if the caller
   owns one, show the management dashboard (stat cards, join code +
   copyable link, roster with a Remove action); if not, show a
   Start/Join tab pair (mirroring the Gift page's Send/Redeem tabs
   exactly) for purchasing a new business account or joining someone
   else's with a code. A third optional "Organization code" field was
   added to Register, prefillable via `?org=CODE` (mirroring `?ref=`
   and `?gift=`).

## Consequences
- Backend: full `mvn test` suite passes — new `OrganizationServiceTest`
  (15 cases: purchase success/already-own-one/declined, mine
  success/none, join success/unknown-code/no-seats/already-a-member,
  register-time join valid/full/unknown/blank, remove-member
  success/not-a-member) and a new `AuthServiceTest` case for org-code
  registration.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass.
- e2e: 11 new Playwright specs (`e2e/specs/b2b-tier.spec.ts`) —
  auth-gating, the Start/Join tabs with plans, purchasing a seat block
  and seeing the charge, joining (success and failure), the owner
  dashboard with join code/roster, removing a member, the Register
  page's `?org=` prefill and API payload, and a11y for both the
  no-account and dashboard states. Full suite (213 specs) passes with
  no regressions.
- Live-verified against a real running backend: purchased 5 Basic
  seats (charged the correct ₹995 = 5 × ₹199), registered a new member
  with the join code and confirmed their plan activated at signup,
  joined a second, already-registered member via the logged-in
  endpoint and confirmed their prior Basic subscription was replaced;
  confirmed the owner's roster and seat count updated correctly after
  each join; removed a member and confirmed their subscription was
  cancelled (`GET /subscriptions/current` → 404) while their old
  membership row no longer blocks them from rejoining; confirmed every
  error path — an owner buying a second org, an existing member trying
  to join again, an unknown join code, and a fully-seated organization
  rejecting a new join. Verified visually in the browser: the owner
  dashboard with a live 5-member roster, the Start/Join tabs for a
  fresh member, and the Register page showing all three code fields
  (Referral, Gift, Organization) together.
- **Not extended to Tamil** (ADR-023's phase 1 scope): the Organization
  page and the new Register fields (`orgCode`, and its label/hint) are
  English-only, same gap already acknowledged for Books/Dashboard/
  Plans/Profile/Gift in ADR-023 — a phase-2 localization branch would
  need to pick these up too.
- The Appendix B backend/infra items (Postgres/Flyway already done in
  ADR-007; Cassandra, Elasticsearch, OpenShift) are the last item in
  the user's stated priority order, still untouched.
