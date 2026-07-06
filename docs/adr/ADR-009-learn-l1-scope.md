# ADR-009: Suvadi Learn L1 — course foundation scope

## Status
Accepted (2026-07-06)

## Context
`docs/plans/learning-platform.md` designs the full Suvadi Learn platform —
in-person classes, INSTRUCTOR-authored content, paid enrollment, quizzes,
certificates — across phases L1 through L6. L1 is the foundation everything
else builds on: courses need to exist and be enrollable before anything
else (instructors, payments, in-person scheduling) makes sense to build.

## Decision
1. **ADMIN-only authoring, no INSTRUCTOR role yet.** `AdminLearnController`
   reuses the existing `hasRole('ADMIN')` gate rather than introducing a new
   role. The domain model (`Course` → `CourseModule` → `Lesson`) has no
   author/owner field, so adding INSTRUCTOR later is a column addition, not
   a schema rework.
2. **Free courses only.** `EnrollmentService.enroll()` rejects any course
   with `price > 0` with an explicit "aren't available for enrollment yet"
   message — the payments integration (`docs/plans/learning-platform.md`
   phase L5) is real work (provider, refunds, receipts) that L1 deliberately
   does not stub out. `Course.price` exists now so seeding/pricing UI never
   needs a migration when L5 lands; the guard is the only thing L5 removes.
3. **Append-only syllabus builder.** `addModule`/`addLesson` only append at
   the next `sortOrder` — no reorder, edit-in-place, or delete endpoints.
   Matches the same trade-off already made for `CourseModuleRepository`/
   `LessonRepository`: get course creation unblocked, defer the editing
   UX questions (drag-reorder, versioning published content) to when there
   are enough real courses to know what that UX needs to do.
4. **Event-driven, no consumer yet.** `course.enrolled` publishes to
   `Topics.COURSE_EVENTS` (`library.course.events`) via the existing outbox
   (ADR-008) — same "seed the topic now, no listener needed yet" pattern
   already used for `book.updated`. Notifications-on-enroll, progress
   tracking, and completion certificates are all future consumers of this
   one topic, not new producer call sites.
5. **Reuses the existing design system and data-fetching conventions**
   verbatim: `src/features/learn/queries.ts` mirrors
   `src/features/books/queries.ts`; `CoursesAdmin.tsx` mirrors
   `BooksAdmin.tsx`'s dialog-based CRUD; the Dashboard gained a third
   "My learning" tab alongside the existing reading/history tabs rather
   than a separate page.

## Consequences
- A learner sees `/learn`, browses by track/level, reads the full syllabus,
  and enrolls in "Money Foundations" (the seeded free course) — verified
  live end-to-end (register → browse → detail → enroll → dashboard "My
  learning" tab) and via 26 new Playwright specs (`learn.spec.ts` +
  `admin.spec.ts` additions), all gated on WCAG 2.2 A/AA.
- An admin creates a draft course, builds its syllabus (modules → lessons),
  and publishes it — verified live via the same flow plus specs.
- Backend: 44/44 unit tests pass (11 new: `CourseServiceTest`,
  `EnrollmentServiceTest`), including the duplicate-slug, draft-course,
  paid-course, and already-enrolled rejection paths.
- One real bug found and fixed during live verification: `Enrollment
  .enrolledAt` used `@CreationTimestamp`, which Hibernate only populates at
  flush time — the enroll response returned `enrolledAt: null` immediately
  after `save()` even though the row was written correctly. Fixed by
  setting it explicitly in `EnrollmentService.enroll()`
  (`.enrolledAt(LocalDateTime.now())`), matching the same pattern
  `LoanService` already uses for `borrowedAt`.
- Paid tracks (Equities, Derivatives, Portfolio & Risk) can be seeded and
  browsed today; enrolling in them is the L5 payments phase's job to
  unlock, not L1's.
