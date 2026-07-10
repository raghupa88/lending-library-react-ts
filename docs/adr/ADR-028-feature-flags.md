# ADR-028: Feature flags (global on/off switches + admin UI)

## Status
Accepted (2026-07-10)

## Context
The user asked directly: "have you worked on my request to introduce
feature flag to enable or disable feature for users?" No such request
had been made or built anywhere in this session — confirmed via git
history and a full-repo search for "feature flag"/`FeatureFlag`. Asked
to scope it, the user chose explicitly between the two open questions:
(1) **global on/off switches**, not per-user/cohort targeting or
percentage rollouts, and (2) a **new Admin UI page** to manage flags,
not a backend-only surface. Both choices are the user's, verbatim —
this ADR does not revisit them.

Unlike prior features, this one has no product screen to gate on its
own — a flag system only matters once something is actually gated. The
choice of *which* feature to demonstrate it on is this session's own
scoping decision: **B2B tier** (ADR-024), because it's the most
recently added, self-contained optional feature — disabling it can't
strand an existing core workflow (browsing, borrowing, subscriptions)
the way gating something load-bearing would.

## Decision
1. **`FeatureFlag` entity**: `key` (unique, `flag_key` column — `key`
   is a reserved word in H2 and elsewhere, so the Java field stays
   `key` while the column is renamed), `name`, `description`,
   `enabled` (boolean, defaults `false` for new flags). No per-user,
   per-plan, or percentage-rollout fields — the user's scope was
   global-only.
2. **`FeatureFlagService.isEnabled(key)` fails closed on an unknown
   key** — returns `false` rather than throwing. Callers only ever
   check hardcoded key constants (`FeatureFlagKeys.B2B_TIER`), so an
   unrecognized key can only mean a code bug, not a real user-facing
   case; throwing there would just convert a typo into a 500 for no
   benefit.
3. **Two API surfaces**: `GET /api/v1/feature-flags` (public,
   `permitAll()`, returns only the enabled key strings — this is what
   the frontend polls to gate UI, and it deliberately reveals nothing
   about disabled flags) vs. `/api/v1/admin/feature-flags` (full CRUD,
   already covered by the existing `/api/v1/admin/**` →
   `hasRole("ADMIN")` rule, no new security config needed there).
4. **Asymmetric gating on B2B tier, extending the exact pattern this
   codebase already established for gift/referral codes (ADR-022)**:
   `OrganizationService.purchase()` and `.join()` throw a hard
   `BusinessException` ("Business accounts are not available right
   now") when the flag is off — these are explicit, deliberate actions,
   and failing silently would hide a real problem from the one person
   who needs to know. `joinAtRegistration()` instead folds the disabled
   check into its existing blank/invalid-code short-circuit and
   silently returns `Optional.empty()` — registration must never fail
   because of an org code, flag on or off. Existing entitlements
   (`mine()`, `removeMember()`) are **never** gated: disabling a flag
   stops new adoption, not access already paid for.
5. **Frontend gating via one hook**: `useIsFeatureEnabled(key)` wraps a
   cached `useFeatureFlagsQuery()` (60s `staleTime`) and returns
   `false` until the flags have loaded — the same fail-closed default
   as the backend. Applied identically in `Footer.tsx` (hide the "For
   schools & businesses" link), `Plans.tsx` (hide the business-account
   upsell line), `Register.tsx` (hide the Organization code field), and
   `Organization.tsx` (existing owners still see their full dashboard;
   everyone else sees an EmptyState instead of the Start/Join tabs).
6. **New Admin UI page** (`/admin/feature-flags`, added to
   `AdminShell`'s nav): a table of all flags with an Enable/Disable
   toggle per row, and an "Add flag" dialog (key validated as lowercase
   `snake_case` via the same regex the backend enforces). New flags are
   created disabled by default — nothing should light up for users
   without a deliberate second step.
7. **Seed migration** (`V19__feature_flags.sql`) inserts `b2b_tier`
   already `enabled = true`, so running this migration doesn't
   change any existing behavior for existing users the moment it
   deploys — the flag exists to let an admin turn B2B *off* going
   forward, not to silently disable it on release.

## Consequences
- Backend: full `mvn test` suite passes — 208 tests (up from 197),
  including 8 new `FeatureFlagServiceTest` cases and 3 new
  `OrganizationServiceTest` cases for the disabled-flag paths
  (purchase throws, join throws, registration-time join silently
  no-ops). `BUILD SUCCESS`.
- Frontend: `npm run typecheck`, `npm run lint`, and `npm run build`
  all pass.
- e2e: 9 new Playwright specs (`e2e/specs/feature-flags.spec.ts`) —
  the admin page listing flags, adding a flag, disabling a flag, an
  a11y check, and the frontend gating behavior (Footer link hidden,
  Plans upsell hidden, Register's Organization code field hidden,
  Organization page's EmptyState for non-owners vs. the full dashboard
  for existing owners) both with the flag enabled and disabled. One
  pre-existing spec (`b2b-tier.spec.ts`'s register-prefill test) needed
  a fix, not a workaround: it only mocked `/books` and not
  `/feature-flags`, so the unmocked query never resolved and the now
  flag-gated Organization-code field never rendered — added the same
  `setupFeatureFlagsApiMocks` mock every other spec already gets via
  `setupAllApiMocks`. Full suite: 227 specs pass, no regressions.
- Live-verified against a real running backend: `GET /feature-flags`
  returned `["b2b_tier"]` after migration; disabling it via
  `PUT /admin/feature-flags/b2b_tier` immediately (a) emptied the
  public list, (b) made `POST /organizations` and
  `POST /organizations/join` return the expected 400 with "Business
  accounts are not available right now", and (c) let `POST
  /auth/register` with an `orgCode` still succeed normally (org code
  silently ignored); re-enabling restored all three. Confirmed via the
  seeded `admin@example.com` / `member@example.com` accounts.
- **Not extended to Tamil** (ADR-023's phase 1 scope) or to any other
  existing feature (referral credits, gift subscriptions, subscription
  pause, etc.) — only B2B tier was gated, as a deliberate, minimal
  demonstration of the flag system rather than a retrofit across the
  whole app.
