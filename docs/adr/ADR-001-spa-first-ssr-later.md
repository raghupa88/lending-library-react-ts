# ADR-001: SPA first, SSR as a later learning module

## Status
Accepted (2026-07-04)

## Context
The previous custom Express SSR rendered an empty shell: `renderToString` ran with
no data fetching and no state serialization, so every page hydrated from blank.
It imposed all of SSR's constraints (no `localStorage` at render time, double
rendering, auth ambiguity) while delivering none of its SEO/LCP value. The app is
heading toward a dashboard-heavy, cookie-authenticated experience built on
TanStack Query — a classic SPA shape.

## Decision
Convert to a plain Vite SPA (`src/main.tsx`, `createRoot`). Real SSR with data
hydration (TanStack Query `dehydrate`/`HydrationBoundary`, streaming) may return
later as a dedicated learning branch once there is real data worth hydrating.

## Consequences
- `server.js`, `entry-server.tsx`, `entry-client.tsx` and the split build are gone.
- Dev/prod both serve through Vite (nginx takes over static serving in Docker).
- `VITE_SSR_MIGRATION_PLAN.md` remains as historical context.
