# ADR-005: Server state lives in TanStack Query, not React Context

## Status
Accepted (2026-07-04)

## Context
`BookContext` re-implemented fetching, caching and loading flags with
`useState`/`useEffect`, swallowed errors silently, and refetched on every
filter keystroke with no deduplication. Server data (books, loans, plans) is
not client state.

## Decision
TanStack Query owns all server state: feature modules expose typed hooks
(`src/features/books/queries.ts` is the template — `useBooksQuery`,
`useBookQuery`). Context remains only for true client state: identity
(`AuthContext`) and theme (`ThemeContext`). `BookContext` survives temporarily
for the legacy catalog page and is deleted with the catalog redesign.

## Consequences
- Caching, dedup, retries and invalidation come from the library.
- Mutations (borrow/return) get optimistic updates + invalidation graphs.
- Errors surface as typed `ApiError`s to toasts instead of vanishing.
