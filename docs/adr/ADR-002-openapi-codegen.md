# ADR-002: Generate API types from the springdoc OpenAPI spec

## Status
Accepted (2026-07-04)

## Context
Hand-written frontend types drifted from backend DTOs and produced real bugs:
the frontend read `data.id` while `AuthResponse` sends `userId`, and expected
`coverUrl` while `BookResponse` sends `cover`. Two type files (Subscription,
Order) were dead code.

## Decision
`npm run codegen:api` generates `src/lib/api-types.gen.ts` from the running
backend's spec (`/api/v1/docs`) using `openapi-typescript`. The generated file
is committed; CI will regenerate and `git diff --exit-code` to catch drift.
Feature modules define thin domain interfaces (e.g. `BookSummary`) that mirror
DTO fields until they migrate onto the generated types wholesale.

## Consequences
- The backend spec is the single contract; native apps can codegen from it too.
- Contract drift becomes a CI failure instead of a runtime bug.
