# Suvadi Library — Subscription Lending Library

A full-stack subscription lending library for the reading community in Tamil
Nadu: a React SPA with a warm-literary design system in front of a Spring Boot
REST API. What started as a straightforward book-lending app has grown into a
broader learning vehicle for both frontend platform work and (on the backend
track) distributed-systems tooling — it now also includes a corporate
learning arm ("Suvadi Learn": courses, quizzes, certificates, in-person
classes), monetization features (referrals, gift subscriptions, a B2B tier),
and a Kafka/Cassandra/Elasticsearch/OpenShift backend track.

## Stack

**Frontend** (repo root)
- React 19 + TypeScript 5 + Vite (SPA)
- Tailwind CSS v4 with CSS-first design tokens (light "Reading Room" / dark
  "Midnight Library", WCAG 2.2 AA validated)
- shadcn-style component kit in `src/components/ui/` (CVA + tailwind-merge)
- TanStack Query for server state; React Context only for identity/theme/locale
- API types generated from the backend OpenAPI spec (`npm run codegen:api`)
- Vitest + Testing Library units; Playwright e2e with API mocking and
  axe-core WCAG A/AA gates (25 spec files)

**Backend** (`backend/`)
- Spring Boot 3.3, Java 21, JWT auth (rotation + reuse detection, dual-mode
  cookie/native delivery)
- Postgres + Flyway in production/Docker (19 migrations); H2 in Postgres mode
  for local dev and tests
- ~80 REST endpoints across 18 controllers: auth, books, loans, subscriptions
  (pause/resume, annual billing, referral credits), orders, gifts, B2B
  organizations, book reservations/waitlist, notifications, activity feed,
  feature flags, admin (users/books/loans/analytics), and the Suvadi Learn
  platform (courses, lessons, tests/certificates, venues/batches)
- Optional Kafka event backbone (transactional outbox → notifications/email),
  Cassandra-backed activity feed, and Elasticsearch book search — all behind
  Spring profiles, off by default for plain `mvn spring-boot:run`
- Swagger UI at `http://localhost:8080/api/v1/swagger-ui.html`

See `docs/adr/` for the full architecture decision log (28 ADRs, one per
feature branch) and `DEVELOPER_GUIDE.md` for local setup.

## Getting started

```bash
# Frontend (http://localhost:3000)
npm install
npm run dev

# Backend (http://localhost:8080) — needs Java 21 + Maven, and JWT_SECRET set
cd backend
JWT_SECRET="local-dev-secret-key-32-chars-minimum!!" mvn spring-boot:run
```

There's no baked-in JWT secret — the app fails fast at startup without one
(12-factor config). For the full stack with real Postgres, Kafka, Cassandra,
and Elasticsearch, use `docker compose up --build` (see `DEVELOPER_GUIDE.md`).

Demo credentials: `member@example.com` / `admin@example.com`, password
`password123`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | Production build to `dist/` |
| `npm test` | Vitest unit tests |
| `npm run lint` / `npm run typecheck` | ESLint (flat config) / `tsc` for app + e2e |
| `npm run test:e2e` | Playwright suite (API-mocked, includes axe a11y gates) |
| `npm run codegen:api` | Regenerate `src/lib/api-types.gen.ts` from the running backend |
| `npm run perf:lighthouse` / `perf:cdp` / `perf:mcp` | Performance audits |

Backend: `cd backend && mvn test` runs the full JUnit/Mockito suite against H2
(no external services needed); `mvn spring-boot:run -Dspring-boot.run.profiles=postgres`
switches to a real Postgres datasource.

## Project structure

```
src/
├── components/
│   ├── ui/          # design-system primitives (button, card, dialog, toast, …)
│   └── layout/      # MemberShell, AdminShell, Navbar, Footer
├── features/        # per-feature data hooks (books, organizations, feature-flags, learn, …)
├── pages/           # route-level screens, including pages/Admin/*
├── context/         # client state only: Auth, Theme, Locale
├── lib/             # api client, tokenStore, queryClient, generated API types
└── styles/          # globals.css — the design-token source of truth
backend/             # Spring Boot API (domain/application/infrastructure/api layers)
e2e/                 # Playwright specs, fixtures, API mocks, axe helper
docs/adr/            # architecture decision records (one per feature branch)
docs/plans/          # longer-form design docs (e.g. the Suvadi Learn platform)
```

## Subscription plans

- **Basic**: ₹199/month — up to 3 books at a time, 15-day loan period
- **Premium**: ₹399/month — unlimited books, 30-day loan period, priority
  delivery, early access to new titles

Both plans support annual billing (2 months free), referral credits applied
at subscribe time, gift subscriptions purchased for someone else, and bulk
seat purchases through the B2B tier for schools/companies. See
`docs/adr/ADR-020` through `ADR-024` for how each works.

## Accessibility & design

- All color token pairs are contrast-checked against WCAG 2.2 AA; e2e specs
  assert zero axe violations per redesigned page in both themes.
- Keyboard-first: skip link, focus-visible rings, native `<dialog>` modals
  with platform focus traps, `aria-live` toast region,
  `prefers-reduced-motion` respected.
- Responsive mobile-first layouts; sheet-based mobile navigation.
- Tamil localization (phase 1) — see `docs/adr/ADR-023-tamil-localization-p1.md`
  for current coverage.

## Roadmap

Every feature originally planned for this project has shipped: the full
frontend redesign (catalog, auth, member dashboard, admin panel), Postgres/
Flyway + Docker Compose, refresh-token rotation with dual-mode delivery, a
Kafka event backbone, the Suvadi Learn platform end-to-end (courses through
certificates and in-person batches), book reservations, loan renewals, late
fees, subscription pause, annual billing, referral credits, gift
subscriptions, a B2B tier, Tamil localization (phase 1), a Cassandra activity
feed, Elasticsearch search, an OpenShift deployment, and global feature flags
with an admin UI. `docs/adr/` has the full history in order — start at
`ADR-001-spa-first-ssr-later.md` for the frontend's founding decision or
`ADR-006-backend-stack-roles.md` for the backend/infra track.

## License

MIT
