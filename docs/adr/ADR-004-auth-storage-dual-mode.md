# ADR-004: Token storage — single tokenStore now, dual-mode cookie/native later

## Status
Accepted (2026-07-04) — backend part pending (backend hardening branch)

## Context
JWTs lived in `localStorage`, sprinkled across modules, with the refresh token
stored but never used. httpOnly-cookie refresh tokens are the web best practice
but are browser-only — and this product will later ship native apps that need
token-based flows with platform secure storage.

## Decision
1. Now: all token access goes through the `tokenStore` in `src/lib/api.ts`; no
   other module touches storage. This makes the storage swap a one-file change.
2. Backend hardening branch: refresh-token rotation with reuse detection,
   issued dual-mode — httpOnly cookie flow for browsers, token-in-body flow for
   native clients (selected via client type header), same rotation service
   underneath. Web access tokens then move to memory only.

## Consequences
- XSS blast radius shrinks to the in-memory access token once cookies land.
- The REST API stays session-free and native-app friendly.
