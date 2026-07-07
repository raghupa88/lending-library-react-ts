# ADR-011: Suvadi Learn L3 — tests, attempts, and certificates

## Status
Accepted (2026-07-07)

## Context
`docs/plans/learning-platform.md` scopes L3 as "Test builder, timed quiz
runner, attempts/scoring, certificate issue + verify page", with "IT:
pass/fail/attempt limits; e2e keyboard-only test run" as the explicit
verification bar. This builds on L1 (courses/enrollment) and L2 (lesson
progress) without touching either.

## Decision
1. **The entity is `LearnTest`, not `Test`.** Every test file in this
   backend imports `org.junit.jupiter.api.Test`; a domain entity literally
   named `Test` would collide on import in the same package used by every
   test class. Same reasoning as `CourseModule` avoiding `java.lang.Module`
   (ADR referenced in L1). The Flyway table is still `tests` — only the
   Java class name changes.
2. **Options never leak the answer key before submission.** Two response
   shapes exist for the same data: `OptionResponse` (learner-facing, no
   `correct` field at all — not just hidden, structurally absent) for
   `GET /learn/tests/{id}`, and `AdminOptionResponse` (`correct` included)
   for the admin authoring endpoints. Verified live: `grep -c '"correct"'`
   against the learner-facing payload returns zero. The answer key only
   appears in the *result* payload after submission, where revealing it is
   the point (per-question review).
3. **Scoring is exact-set-match, computed server-side, never trusted from
   the client.** A question is correct only if the learner's selected
   option IDs exactly equal the set of options flagged `correct` — this
   makes `MULTI` questions require every correct option and no incorrect
   one, with no partial credit ambiguity. `AttemptService.submitAttempt`
   recomputes everything from the stored question/option rows; the client
   only ever sends which option IDs were selected.
4. **Time limits are informational, not enforced server-side.** The
   attempt records `startedAt`/`submittedAt`; the frontend shows a
   countdown from `timeLimitMin`. A late submission still scores normally.
   Real enforcement (rejecting a submission past the deadline) is a
   deliberate non-goal for a demo learning platform — the risk it guards
   against (a learner gaming an open-book quiz) doesn't justify the added
   failure mode (a legitimate learner's last answer getting rejected over
   a network-latency lag at the buzzer).
5. **Certificates are per-(user, course), not per-attempt.** A learner
   passing the same test twice doesn't get two certificates —
   `submitAttempt` checks `CertificateRepository.findByUserAndCourse`
   first and only mints a new serial (`SUV-XXXXXXXX`) when none exists.
   `certificateIssued` in the response distinguishes "just earned" from
   "already had one," so the frontend can show the right message without
   a second query.
6. **Certificate verification is deliberately public.** `GET
   /learn/certificates/{serial}` has no `@AuthenticationPrincipal` and is
   `permitAll()`'d — a certificate is meant to be checked by anyone who
   has the serial (an employer, a curious friend), not just the learner
   who earned it. Found and fixed a real gap here: the existing broad
   `GET /api/v1/learn/courses/**` permitAll rule from L1/L2 would have
   *also* covered the new `GET /learn/courses/{id}/tests` endpoint (Spring
   Security's `**` crosses path segments, unlike the `*` used in the L2
   progress-endpoint fix) — an unauthenticated caller would have hit a
   controller method expecting `@AuthenticationPrincipal` and NPE'd rather
   than cleanly 401/403ing. Fixed the same way as L2: a specific
   `authenticated()` matcher registered before the broad permitAll rule.
7. **The question-builder UI doesn't rely on native radio-group semantics
   for "mark as correct."** Each option is an independent
   `{label, correct}` object in a `react-hook-form` field array — there's
   no single "which index is correct" field a native `<input type="radio"
   name="...">` group could bind to. Tried wiring `register()` to a shared
   `name` for single-answer questions first; RHF's own `register()` call
   overwrites that name with the field's path (`options.0.correct`,
   `options.1.correct`, ...), silently breaking the mutual-exclusivity a
   real radio group would enforce — an admin could check "correct" on two
   options for a SINGLE question with no browser-level pushback, only
   catching it at submit-time validation. Fixed with a controlled toggle
   (`setValue` clearing every other option's `correct` flag) instead of
   relying on native grouping, so the UI itself can't produce invalid data
   for `SINGLE`/`TRUEFALSE` kinds.
8. **Learner test-taking uses real native radios/checkboxes, keyed by a
   shared `name` per question** — this is what makes the "keyboard-only
   test run" requirement basically free: Tab lands on the group, arrow
   keys move the native selection, Space/Enter activates it, with zero
   custom keyboard-handling code. Verified with a dedicated e2e spec that
   never calls `.click()` — only `.focus()` + `page.keyboard.press(...)`.

## Consequences
- Backend: 69/69 tests pass (18 new: `TestServiceTest`,
  `AttemptServiceTest`, `CertificateServiceTest`), including partial-score
  computation, attempt-limit exhaustion, double-submit rejection, wrong-user
  rejection, and certificate non-duplication.
- Frontend: 136/136 e2e specs pass (23 new across `tests.spec.ts` and
  `admin.spec.ts`), including a dedicated keyboard-only run and WCAG 2.2
  A/AA gates on the test runner (both themes) and certificate page.
- Verified live end-to-end: admin creates a test with a SINGLE and a
  TRUEFALSE question → learner enrolls → sees the test on the course page
  → takes it (intro → one-question-at-a-time → review → submit) → passes
  → certificate minted → public verify page confirms it → same flow shown
  on the Dashboard's "My learning" tab.
- One test-infrastructure fix worth naming: a WCAG dark-theme check on the
  test-runner page reproduced a color-contrast failure deterministically
  (not the usual one-off flake pattern seen in earlier branches) — the
  quiz screen has more simultaneously-transitioning elements
  (`transition-colors` on every option label) than any prior page, making
  the axe scan reliably sample mid-fade. Fixed with a short settle wait
  after the theme toggle in that one spec, rather than papering over it or
  leaving a flaky test in the suite.
- L4 (in-person classes: venues, batches, booking, attendance) and L5
  (payments) remain untouched and unblocked by anything here — `tests`
  hangs off `courses`, same as `enrollments` and `lesson_progress`, with no
  new dependency either later phase needs to route around.
