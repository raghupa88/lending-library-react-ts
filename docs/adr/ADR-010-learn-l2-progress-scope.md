# ADR-010: Suvadi Learn L2 — lesson progress and player scope

## Status
Accepted (2026-07-07)

## Context
`docs/plans/learning-platform.md` scopes L2 as "MinIO materials, lesson
player, progress tracking, continue-where-you-left". This environment has
no Docker daemon, so the MinIO/object-storage half of that scope can't be
built and verified the way the rest of this project's infra has been
(live, against a running service) — the same constraint that gated the
Kafka broker in ADR-008.

## Decision
1. **Progress tracking is a new table, not a bolt-on field.**
   `lesson_progress(enrollment_id, lesson_id, completed_at)` with a unique
   constraint on `(enrollment_id, lesson_id)` — completing an
   already-completed lesson is a no-op, not an error, matching how
   `EnrollmentService.enroll()` already treats re-enrollment. `LessonProgressService`
   computes `totalLessons`/`completedLessons`/`nextLessonId` from the
   course's actual module/lesson ordering, not a stored counter — a course
   is small enough (single digits of lessons in this domain) that
   recomputing on every read is simpler and can't drift.
2. **`EnrollmentResponse` carries progress, not just enrollment metadata.**
   `EnrollmentService.enroll()` and `.myEnrollments()` both attach a
   progress summary (`totalLessons`, `completedLessons`, `nextLessonId`) via
   the same `LessonProgressService.buildProgress(...)` call, so the
   Dashboard's "My learning" tab and the enroll-success flow both get a
   working "Continue" deep link with no extra round trip. (Caught live: the
   first version only attached progress in `myEnrollments()` — the `enroll()`
   response still returned `totalLessons: 0, nextLessonId: null` via the
   old zero-arg factory, which would have sent a fresh enrollee's "Continue"
   link nowhere. Fixed by routing both call sites through one
   `toResponseWithProgress` helper.)
3. **The progress endpoint is authenticated even though course browsing
   isn't.** `GET /learn/courses/{id}/progress` sits under the same
   `/learn/courses/**` path prefix that's `permitAll()` for public catalog
   browsing (ADR from L1's `SecurityConfig`). A more specific
   `.requestMatchers(GET, "/learn/courses/*/progress").authenticated()`
   rule had to be added *before* the broader permitAll rule — Spring
   evaluates matchers in registration order, and the broad rule would
   otherwise have shadowed it, letting an anonymous request reach a
   controller method that calls `@AuthenticationPrincipal user.getUsername()`
   and NPEs instead of cleanly 401/403ing. Found and fixed before any
   frontend code was written against it.
4. **Object storage is out of scope for L2, by design, not by omission.**
   Lesson content still flows through the `contentUrl`/`body` fields L1
   already shipped (external links for VIDEO/PDF/SLIDES, inline text for
   ARTICLE) rather than a `materials` table backed by MinIO presigned
   uploads. The lesson player renders all four `LessonKind` values
   generically (embed for VIDEO, "Open PDF"/"Open slides" link for
   PDF/SLIDES, inline prose for ARTICLE), so the code path is ready for
   real uploaded files — swapping `contentUrl` from an external link to a
   presigned MinIO URL is a backend-only change once Docker is available
   to stand up and verify object storage. No fabricated placeholder URLs
   were seeded to "demonstrate" this — the existing 6 ARTICLE lessons from
   L1 are what's actually verified end-to-end.
5. **Player UI reuses L1's syllabus, doesn't duplicate it.** The lesson
   player fetches the same `GET /learn/courses/{slug}` course-detail
   endpoint L1 built (full modules/lessons tree) rather than adding a
   lesson-specific fetch endpoint — the ordered lesson list, prev/next
   navigation, and sidebar outline are all derived client-side by flattening
   `course.modules[].lessons[]`, keyed against the separate progress
   response for completed/next state.

## Consequences
- Backend: 51/51 tests pass (7 new: `LessonProgressServiceTest` +
  `EnrollmentServiceTest` additions), including idempotent-completion and
  not-enrolled-rejection paths.
- Frontend: 121/121 e2e specs pass (14 new in `learn.spec.ts`), including
  WCAG 2.2 A/AA gates on the lesson player in both themes.
- Verified live end-to-end against the running backend + dev server:
  register → enroll → lesson player → mark complete → advance to next
  lesson → **reload the page → progress (checkmark, progress bar) persists**
  → Dashboard "My learning" tab's "Continue" link lands on the correct
  next lesson. This is the plan's stated L2 key verification
  ("complete lesson → progress persists across reload") and it holds.
- Real bug caught and fixed before shipping: the enroll-response
  progress gap described in decision 2, and the security-matcher ordering
  gap described in decision 3 — both found by live-testing the actual HTTP
  responses rather than trusting the unit tests alone (the unit tests
  mocked the collaborators that would have hidden both bugs).
- L3 (tests & certificates) and the MinIO upload pipeline remain explicitly
  deferred; L3's test/attempt/certificate tables are a clean addition on
  top of `enrollments` and don't require revisiting anything L2 shipped.
