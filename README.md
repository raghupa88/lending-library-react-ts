# Suvadi Library — Subscription Lending Library

A full-stack subscription lending library for the reading community in Tamil
Nadu: a React SPA with a warm-literary design system in front of a Spring Boot
REST API. This repo doubles as a learning vehicle for modern frontend platform
work and (on the backend track) distributed-systems tooling.

## Stack

**Frontend** (repo root)
- React 19 + TypeScript 5 + Vite (SPA)
- Tailwind CSS v4 with CSS-first design tokens (light "Reading Room" / dark
  "Midnight Library", WCAG 2.2 AA validated)
- shadcn-style component kit in `src/components/ui/` (CVA + tailwind-merge)
- TanStack Query for server state; React Context only for identity/theme
- API types generated from the backend OpenAPI spec (`npm run codegen:api`)
- Vitest + Testing Library units; Playwright e2e with API mocking and
  axe-core WCAG A/AA gates

**Backend** (`backend/`)
- Spring Boot 3.3, Java 21, JWT auth, H2 (Postgres + Flyway planned)
- 18 REST endpoints: auth, books, loans, subscriptions, orders, users, admin
- Swagger UI at `http://localhost:8080/api/v1/swagger-ui.html`

See `docs/adr/` for the architecture decision records and
`DEVELOPER_GUIDE.md` for full local setup.

## Getting started

```bash
# Frontend (http://localhost:3000)
npm install
npm run dev

# Backend (http://localhost:8080) — needs Java 21 + Maven
cd backend
mvn spring-boot:run
```

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

## Project structure

```
src/
├── components/
│   ├── ui/          # design-system primitives (button, card, dialog, toast, …)
│   └── layout/      # MemberShell, Navbar, Footer
├── features/        # per-feature data hooks + components (books, …)
├── pages/           # route-level screens
├── context/         # client state only: Auth, Theme (+ legacy BookContext)
├── lib/             # api client, tokenStore, queryClient, generated API types
└── styles/          # globals.css — the design-token source of truth
backend/             # Spring Boot API
e2e/                 # Playwright specs, fixtures, API mocks, axe helper
docs/adr/            # architecture decision records
```

## Subscription plans

- **Basic**: ₹299/month — 2 books
- **Standard**: ₹499/month — 4 books (popular)
- **Premium**: ₹799/month — 6 books, free home delivery
- **Family**: ₹1199/month — 8 books, delivery, community events

## Accessibility & design

- All color token pairs are contrast-checked against WCAG 2.2 AA; e2e specs
  assert zero axe violations per redesigned page in both themes.
- Keyboard-first: skip link, focus-visible rings, native `<dialog>` modals
  with platform focus traps, `aria-live` toast region,
  `prefers-reduced-motion` respected.
- Responsive mobile-first layouts; sheet-based mobile navigation.

## Roadmap

The redesign lands branch by branch: catalog + book detail, auth screens,
member dashboard with the full borrow/return + subscription loop, admin panel,
then the backend/infra track (Postgres/Flyway, Kafka events, Cassandra
activity feeds, Elasticsearch search + Kibana observability, Docker Compose,
OpenShift). Details in `docs/adr/ADR-006-backend-stack-roles.md`.

## License

MIT
