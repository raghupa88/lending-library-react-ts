# Suvadi Learn — Capital-Markets Learning Platform

**Status**: Proposed (design doc) · **Owner**: raghupa88 · **Last updated**: 2026-07-06

## 1. Vision & business case

Extend Suvadi from a lending library into a community education business:
structured courses on investing in capital markets — **equities, bonds &
fixed income, and derivatives** — for students and young people in the local
community, delivered as a hybrid of self-paced online learning and
**in-person classes at local venues** in Tamil Nadu.

Why it fits:
- **Audience overlap** — the library's members are already readers investing
  in self-improvement; finance titles (e.g. seed catalog's *Atomic Habits*,
  *Sapiens* genre-adjacent shelf) can cross-promote courses.
- **Existing rails** — auth + RBAC, subscription billing, the admin panel,
  the design system, notifications and (planned) payments/events
  infrastructure are all reusable.
- **Revenue + community mission** — paid certification tracks fund free
  awareness content; in-person classes build the local community the brand
  is built around.

**Compliance guardrail (non-negotiable)**: this is *education, not advice*.
Every course, test and class carries a standing disclaimer that content is
educational, not investment advice or stock recommendations, and that the
platform is not a SEBI-registered investment adviser or research analyst.
No live "tips", no portfolio recommendations, simulated examples only.

## 2. Personas & top-level capabilities

| Persona | Capabilities |
|---|---|
| **Learner** (member) | Browse course catalog by track/level · enroll (free or paid) · watch/read lessons · take quizzes & final tests · track progress + earn certificates · book seats in in-person batches (waitlist when full) · get reminders |
| **Instructor** (new role) | Author assigned courses · manage lesson materials · build question banks/tests · run in-person batches · mark attendance |
| **Admin** | Everything instructors can, plus: publish/retire courses · manage venues, batches, pricing · manage enrollments & refunds · analytics (completion, scores, attendance, revenue) |

## 3. Learning product shape

**Tracks (initial curriculum)**
1. *Money Foundations* (free — the acquisition funnel): saving vs investing, risk, compounding, mutual-fund basics
2. *Equities 101*: markets, exchanges, order types, reading annual reports, valuation basics
3. *Bonds & Fixed Income*: G-secs, corporate bonds, yields, duration, ladders
4. *Derivatives, carefully*: futures & options mechanics, hedging vs speculation, risk warnings front-and-center
5. *Portfolio & Risk*: asset allocation, SIPs, taxation basics, behavioral pitfalls

**Course structure**: Course → Modules → Lessons (video / article / PDF /
slides) → per-module quiz → final test → certificate on pass. Lessons carry
estimated minutes; courses carry level (Beginner/Intermediate/Advanced),
language (Tamil / English — Tamil-first content is the differentiator), and
price (₹0 for free tier).

**In-person classes**: a course can have **batches** — scheduled sessions at
a **venue** (library hall, school, community center) with capacity,
instructor, dates and fee. Booking consumes a seat; full batches offer a
waitlist; attendance is marked per session. Completing an in-person batch
can satisfy the same certificate requirements as the online path.

## 4. Domain model (Postgres — see sequencing note in §7)

```
courses(id, slug, title, track, level, language, summary, price, status[DRAFT|PUBLISHED|RETIRED], created_by)
modules(id, course_id, title, sort_order)
lessons(id, module_id, title, kind[VIDEO|ARTICLE|PDF|SLIDES], content_url|body, est_minutes, sort_order)
materials(id, lesson_id, file_key, mime, size)              -- object storage keys, not blobs
enrollments(id, user_id, course_id, source[ONLINE|BATCH], status, enrolled_at)
lesson_progress(id, enrollment_id, lesson_id, completed_at)
tests(id, course_id|module_id, title, pass_percent, time_limit_min, attempts_allowed)
questions(id, test_id, prompt, kind[SINGLE|MULTI|TRUEFALSE], sort_order)
options(id, question_id, label, is_correct)
attempts(id, test_id, user_id, started_at, submitted_at, score_percent, passed)
answers(id, attempt_id, question_id, selected_option_ids)
venues(id, name, address, city, capacity_default)
batches(id, course_id, venue_id, instructor_id, starts_on, ends_on, schedule_text, capacity, fee, status)
batch_sessions(id, batch_id, session_date, topic)
bookings(id, batch_id, user_id, status[CONFIRMED|WAITLISTED|CANCELLED], booked_at)
attendance(id, batch_session_id, user_id, present)
certificates(id, user_id, course_id, issued_at, serial)
```

New role: `INSTRUCTOR` added to the existing `Role` enum; method security
extends the current `@PreAuthorize` pattern (`hasAnyRole('ADMIN','INSTRUCTOR')`
for authoring, `ADMIN` for publish/pricing/venues).

## 5. API surface (versioned REST, same envelope — native-app ready)

- Public/learner: `GET /learn/courses` (+filters) · `GET /learn/courses/{slug}` ·
  `POST /learn/courses/{id}/enroll` · `GET /learn/me/enrollments` ·
  `POST /learn/lessons/{id}/complete` · `GET/POST /learn/tests/{id}/attempts` ·
  `GET /learn/courses/{id}/batches` · `POST /learn/batches/{id}/book` ·
  `DELETE /learn/bookings/{id}` · `GET /learn/me/certificates`
- Authoring/admin: `POST/PUT /admin/learn/courses|modules|lessons|tests|questions` ·
  `POST /admin/learn/materials` (pre-signed upload) · `POST/PUT /admin/learn/venues|batches` ·
  `PUT /admin/learn/sessions/{id}/attendance` · `GET /admin/learn/analytics/*`

All additions flow into the existing springdoc spec → `npm run codegen:api`
keeps the frontend (and future native apps) contract-true.

## 6. Frontend design (reuses the warm-literary system)

**Member app — new "Learn" section** (navbar gains *Learn*):
- `/learn` — course catalog: track filter chips, level/language filters, course cards (track color band, level badge, ₹/Free, lesson count, "Starts near you" flag when an open batch exists)
- `/learn/:slug` — course detail: syllabus accordion (modules→lessons), outcomes, instructor bio, reviews (later), *Enroll* / *Continue learning* CTA, **upcoming in-person batches** panel with seat availability and *Book a seat*
- `/learn/:slug/lesson/:id` — lesson player: content pane (video embed / article), module outline sidebar, *Mark complete → next*, progress bar
- `/learn/:slug/test/:id` — test runner: timed, one question per screen, keyboard-navigable, review screen, results with per-question feedback, attempts remaining; certificate download on pass
- Dashboard gains a **My learning** tab: enrolled courses w/ progress rings, next lesson deep-link, upcoming class bookings with venue/date, certificates
- Accessibility: same axe gates; test runner fully keyboard-driven; media lessons require captions/transcript fields before publish

**Admin panel — new sections** (sidebar gains Courses / Tests / Classes):
- *Courses*: table + course builder (module/lesson tree with drag order, draft→publish flow, disclaimer checklist gate before publish)
- *Tests*: question-bank editor (single/multi/true-false), pass %, attempt limits, preview-as-learner
- *Classes*: venues CRUD · batch scheduler (course, venue, instructor, dates, capacity, fee) · roster with confirmed/waitlist · per-session attendance grid
- *Analytics*: enrollments over time, completion funnel, average scores, attendance rate, revenue by course/batch

## 7. Architecture & sequencing decisions

1. **Postgres first (hard prerequisite)** — course content is real authored
   data; it cannot live in the current H2 in-memory DB that wipes on every
   restart. The already-planned *backend hardening* phase (Postgres + Flyway,
   Docker) must land before Learn L1. Learn tables arrive as Flyway
   migrations on that foundation.
2. **Files in object storage** — lesson materials/videos go to S3-compatible
   storage (MinIO in docker-compose; pre-signed upload/download), only keys
   in Postgres.
3. **Events reuse** — `course.enrolled`, `lesson.completed`, `test.passed`,
   `batch.booked`, `batch.reminder` publish onto the existing planned Kafka
   outbox; the notification consumer sends booking confirmations and
   class-reminder emails with zero new plumbing; certificates issue off
   `test.passed`.
4. **Payments reuse** — paid courses/batches ride the planned
   `PaymentProvider` port (fake provider first, Razorpay test mode optional).
5. **Search/discovery later** — course search joins the planned Elasticsearch
   index; "popular courses" joins the Cassandra counters.
6. **Native-app friendly** — everything above is plain versioned REST +
   OpenAPI; the test runner and lesson player have no web-only assumptions.

## 8. Delivery phases (each merges green, stacked after the infra track's Postgres phase)

| Phase | Scope | Key verification |
|---|---|---|
| **L1 Course foundation** (~3-4 wks) | Migrations for courses/modules/lessons/enrollments · admin course builder (draft/publish) · learner catalog + detail + free enrollment · My-learning tab | IT: author→publish→enroll; e2e + axe on catalog/detail |
| **L2 Lessons & progress** (~2-3 wks) | MinIO materials, lesson player, progress tracking, continue-where-you-left | e2e: complete lesson → progress persists across reload |
| **L3 Tests & certificates** (~3 wks) | Test builder, timed quiz runner, attempts/scoring, certificate issue + verify page | IT: pass/fail/attempt limits; e2e keyboard-only test run |
| **L4 In-person classes** (~3-4 wks) | Venues, batches, seat booking + waitlist, attendance, reminder emails via events | IT: capacity/waitlist edge cases; booking e2e; reminder lands in Mailpit |
| **L5 Payments** (~2-3 wks) | Paid enrollment/batch fees via provider port, member-plan discounts | Fake-provider checkout e2e incl. failure path |
| **L6 Analytics & polish** (~2 wks) | Admin analytics dashboards, completion funnels, CSV export | Aggregates verified against seeded fixtures |

**Pilot suggestion**: seed *Money Foundations* (free, Tamil + English) and a
single Chennai weekend batch; measure enrollment→completion→batch-booking
conversion before building L5/L6 out fully.

## 9. Risks & mitigations

- **Regulatory perception** — education vs advice line: disclaimer gate in the
  publish flow, curriculum review checklist, no live-market recommendations.
- **Content effort dwarfs code effort** — course authoring is the real cost;
  the free-tier course should be written alongside L1, not after.
- **In-person ops** — waitlists, no-shows, venue changes: keep batch sizes
  small in the pilot; notifications phase (events track) reduces manual work.
- **Scope creep** — discussion forums, live streaming, and a mock-trading
  simulator are all deliberately out of scope for v1 (the simulator is a
  great later differentiator, listed for the roadmap only).
