# ADR-014: Suvadi Learn L6 — analytics & polish

## Status
Accepted (2026-07-07)

## Context
`docs/plans/learning-platform.md` scopes L6 as the final Learn phase:
"Admin analytics dashboards, completion funnels, CSV export", verified by
"Aggregates verified against seeded fixtures." Unlike L1-L5, this phase
adds no new domain concept — it reads existing data (enrollments, lesson
progress, certificates, payments, attendance) and presents it. The
project has never shipped an actual chart before this branch (the L1
admin dashboard uses stat cards and a plain activity list, per its own
plan note deferring "richer" charts); building real charts for the first
time means following the dataviz skill's procedure rather than
improvising colors and mark styles.

## Decision
1. **One backend endpoint, `GET /admin/learn/analytics`, returns every
   aggregate the page needs in one round trip** — total enrollments/
   revenue, a completion funnel, daily enrollment counts, revenue by
   course, and a global attendance rate. A single `AnalyticsService`
   method computes all of it in application code (not native SQL
   `GROUP BY`), consistent with this codebase's existing style for
   modest-scale aggregation (e.g. `BatchService.rosterFor`,
   `EnrollmentService.myEnrollments` already do per-row Java-side work
   rather than reaching for DB-specific aggregate SQL) — acceptable at
   this app's data volume and keeps the query portable across the H2/
   Postgres profiles without a dialect-specific date-truncation function.
2. **The completion funnel counts four independent stages — enrolled,
   started a lesson, completed all lessons, certified — not a strictly
   nested pipeline.** A learner can pass a test and earn a certificate
   without ever completing every lesson (nothing in L3 gates test-taking
   on lesson completion), so the stages are read honestly as four
   separate counts against the same enrollment set rather than implying
   each stage is a strict subset of the one before it.
3. **Revenue groups by course, not by payment purpose.** A course's paid
   in-person batches and its own paid enrollment fee are both "money this
   course made," so `COURSE_ENROLLMENT` and `BATCH_BOOKING` payments for
   the same course sum into one row — a business owner asking "how much
   did Money Foundations earn" wants one number, not two.
4. **Attendance is a single global rate, not a per-batch breakdown.** The
   plan's L6 bar doesn't ask for per-batch attendance detail, and the
   existing admin batch-detail roster (from L4) already shows attendance
   per session for anyone who needs that granularity — this page's rate
   is the headline "how well is in-person attendance going" number.
5. **Charts follow the project's dataviz skill procedure end to end,
   using this app's own accent hue — never the skill's generic default
   palette.** Two color jobs cover every chart here:
   - *Nominal* (one series, magnitude already shown by bar length/height):
     the enrollments-per-day columns and the revenue-by-course bars each
     use one flat accent hue, per the color formula's "never color
     nominal bars by their value" rule — the bar length carries the
     magnitude, color carries nothing more.
   - *Ordinal* (position-in-sequence carries meaning): the completion
     funnel's four stages take a monotone light→dark ramp of the same
     accent hue, since swapping the stage order would change what the
     chart says.
   Both ramps were derived from the app's actual accent tokens (`#b4552d`
   light / `#e07a4c` dark) and validated with
   `scripts/validate_palette.js --ordinal`, once per theme against that
   theme's real surface color:
   ```
   node validate_palette.js "#d99a6f,#c47a4a,#b4552d,#8f3e1f" --ordinal --mode light --surface "#faf6ef"
   node validate_palette.js "#a85a38,#c66840,#e07a4c,#f0a071" --ordinal --mode dark  --surface "#181410"
   ```
   Both passed all four checks (monotone lightness, adjacent ΔL ≥ 0.06,
   light-end contrast ≥ 2:1, single hue) only after nudging the lightest
   light-mode step darker (`#e8b79a` failed light-end contrast at 1.67:1;
   `#d99a6f` passed at 2.21:1) — the "snap to passing" step the skill
   describes, not a first-try palette.
6. **Every value is direct-labeled on the mark itself — no hover tooltip
   layer was built.** With at most four funnel bars, a handful of
   revenue rows, and a short run of enrollment days, the number is
   already legible as plain text beside every bar/column; a tooltip
   would only restate what's already on screen. This follows the skill's
   explicit rule that a tooltip must never be the *only* way to read a
   value — here there's no gate to bypass since the label always renders.
7. **Attendance rate reuses the existing `ProgressBar` component as the
   chart's Meter**, rather than building a new one. Its
   accent-fill-on-`surface-2`-track shape already matches the skill's
   Meter spec (fill carries the value, track is a lighter neutral) with
   zero new code — a single ratio against a 100% ceiling is explicitly a
   Meter/stat-tile job in the skill's form table, not a bar or pie chart.
8. **CSV export is generated client-side from the same JSON the page
   already fetched**, not a second backend endpoint. The aggregates are
   small and already in memory; serializing them to CSV in the browser
   and triggering a `Blob` download avoids a parallel `text/csv`
   response path on the backend for data the JSON endpoint already
   carries in full.

## Consequences
- Backend: 104/104 tests pass (3 new in `AnalyticsServiceTest`, seeded
  with fixture enrollments/payments/attendance covering the funnel math,
  the revenue grouping including a mixed course-enrollment-and-batch-
  booking case, the zero-data no-divide-by-zero path, and a payment
  pointing at a deleted course falling back to "Unknown course").
- Frontend: 163/163 e2e specs pass (5 new in `analytics.spec.ts`),
  covering the populated dashboard, the empty-state charts, CSV export
  triggering a real download, the sidebar nav link, and WCAG 2.2 A/AA
  gates in both themes (reached via `localStorage` + reload, since
  `AdminShell` — unlike the member-facing navbar — has no theme-toggle
  button of its own).
- Verified live against the real backend: seeded a free enrollment with
  partial lesson completion, a fully-completed enrollment, a paid course
  enrollment, and an attended in-person batch session, then confirmed
  the analytics endpoint's funnel/revenue/attendance numbers matched by
  hand, and screenshotted the rendered page in both themes.
- This closes the last phase of `docs/plans/learning-platform.md`'s
  original L1-L6 roadmap. What remains is Appendix B's deferred
  backend/infra track (Postgres in prod, Cassandra, ELK, OpenShift) and
  any new direction the product review addendum's backlog items
  (reservations beyond L4's waitlist, renewals, localization, B2B tier)
  might prioritize next.
