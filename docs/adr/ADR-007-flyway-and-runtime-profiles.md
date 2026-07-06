# ADR-007: Flyway owns the schema; H2 stays as the daemon-less dev profile

## Status
Accepted (2026-07-06)

## Context
The backend ran on H2 with `ddl-auto: create-drop` and a `data.sql` seed —
every restart wiped all data, Hibernate invented the schema, and the JWT
secret had a hardcoded fallback. Authored content (the upcoming learning
platform) makes durable, migration-managed storage a prerequisite.

## Decision
1. **Flyway is the single source of schema truth.** `V1__baseline.sql` is
   hand-written from the entities; `V2__seed_data.sql` replaces `data.sql`.
   Hibernate runs with `ddl-auto: validate`, so any entity↔DDL drift fails
   the boot immediately — on every profile, including dev and tests.
2. **Two runtime profiles.** The default `dev` profile keeps H2 in
   PostgreSQL mode so contributors (and CI sandboxes without a Docker
   daemon) can run the app and the test suite with zero infrastructure —
   but through the exact same Flyway migrations. The `postgres` profile
   (used by docker-compose and deployments) takes its datasource entirely
   from environment variables.
3. **12-factor config**: the hardcoded `JWT_SECRET` fallback is removed —
   the app fails fast at startup when it is unset. Tests supply a fixed
   secret via `src/test/resources/application.yml`; local runs and compose
   use `.env`.
4. **Containers**: multi-stage Dockerfiles (maven→JRE non-root; node→
   unprivileged nginx with an `/api` proxy) and a compose file with
   postgres, backend (readiness-probe healthcheck), frontend and Mailpit.
   The `docker` Spring profile switches logging to structured JSON lines
   for the future Filebeat/Kibana pipeline.

## Consequences
- Data survives restarts under compose; schema changes are reviewable SQL.
- H2-vs-Postgres SQL differences are contained by writing portable DDL and
  running H2 in PostgreSQL mode; integration tests against real Postgres
  (Testcontainers) arrive with the next hardening slice, where a Docker
  daemon is available.
- Anyone starting the backend must now provide `JWT_SECRET` (documented in
  `.env.example` and the developer guide).
