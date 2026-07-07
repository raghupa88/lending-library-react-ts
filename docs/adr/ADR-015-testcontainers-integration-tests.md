# ADR-015: Testcontainers integration tests against real Postgres

## Status
Accepted (2026-07-07)

## Context
ADR-007 (Flyway + runtime profiles) explicitly deferred real integration
testing: "Testcontainers-backed integration tests... are deferred to the
next hardening slice." Every backend test in the suite to date is a
Mockito unit test running against mocked repositories, or a
`@SpringBootTest` against H2 in `MODE=PostgreSQL` compatibility mode —
neither actually exercises the Flyway migrations or JPA queries against a
real Postgres engine, so a real dialect gap (case sensitivity, numeric
precision, date handling, Postgres-specific SQL Flyway generates) could
ship unnoticed. This is that deferred slice, with the Appendix B
backend/infra track's Postgres/JWT/refresh-rotation/Kafka-outbox/payment-
port items already done in prior branches — Testcontainers ITs, Cassandra,
Elasticsearch/Kibana, and OpenShift manifests are what remained, and this
branch scopes to just the first (the others are much larger, speculative
infra additions with no current feature consumer, which this project has
consistently avoided building ahead of need — see every prior ADR's
"don't build unverified complexity" pattern).

## Decision
1. **`*IT.java` classes run via `maven-failsafe-plugin` bound to the
   `verify` phase, separate from `*Test.java` unit tests on `surefire`/
   `test`.** `mvn test` (the fast, Docker-free inner loop) is unaffected;
   `mvn verify` — already what `.github/workflows/ci.yml` runs — now also
   spins up a real Postgres container per IT class via Testcontainers'
   JUnit 5 extension and Spring Boot's `@ServiceConnection`.
2. **Two IT classes, chosen for what a real database proves that mocks
   can't:**
   - `FlywayMigrationIT` — every migration applies cleanly to real
     Postgres (not just H2's Postgres-compatibility shim) and a `User`
     entity round-trips through the real dialect.
   - `PaymentAuditTransactionIT` — the single most valuable IT here. It
     exercises `ADR-013`'s claim that `PaymentService.charge`'s
     `Propagation.REQUIRES_NEW` lets a payment audit row commit
     independently of the caller's rollback. Mockito-mocked unit tests
     can only assert the method *was called*; they cannot prove a nested
     transaction actually commits under a real transaction manager while
     the outer one rolls back. This test runs the real
     `EnrollmentService.enroll()` flow with a declined test card against
     real Postgres and asserts both halves: the enrollment never persists,
     and the `FAILED` payment row does.
3. **Testcontainers' Spring Boot BOM-managed version (1.19.8, bundling
   docker-java 3.3.6) was pinned forward to 1.20.4** (docker-java 3.4.0)
   via an explicit `testcontainers.version` property override. This
   surfaced and was needed to diagnose a real compatibility issue (next
   point), not a routine bump.
4. **A real Docker-API-version negotiation bug was found and fixed along
   the way.** Testcontainers' bundled (shaded) docker-java falls back to
   a hardcoded `RemoteApiVersion.VERSION_1_32` whenever its own version
   probe comes back `UNKNOWN_VERSION` — and against a Docker Engine whose
   minimum supported API is 1.40+, that hardcoded fallback gets rejected
   outright with "client version 1.32 is too old." The fix is **not** a
   `DOCKER_API_VERSION` environment variable (docker-java doesn't read
   one for this) — it's the JVM system property `api.version`, read by
   `DefaultDockerClientConfig.Builder` via `Properties.getProperty("api.version")`.
   Confirmed by decompiling the shaded class inside the Testcontainers
   jar (`javap -c -p -constants` on
   `org.testcontainers.shaded.com.github.dockerjava.core.DefaultDockerClientConfig$Builder`)
   after `DOCKER_API_VERSION` — set both as a shell env var and, more
   rigorously, via `<environmentVariables>` in the failsafe plugin config
   — provably had no effect. The fix lives in the failsafe plugin's
   `<argLine>-Dapi.version=1.41</argLine>`, forwarded to the forked test
   JVM.
5. **This repo's sandboxed session environment cannot run these ITs to
   green, and that limitation is disclosed rather than papered over.**
   After fixing the API-version negotiation (confirmed: the "client
   version 1.32" error stopped appearing), Testcontainers' own Ryuk
   reaper sidecar and the `postgres:16-alpine` image both fail to pull —
   a direct `docker pull hello-world` in this same sandbox reproduces the
   identical failure (`Forbidden` fetching a blob from
   `production.cloudfront.docker.com`), confirming this is the sandbox's
   outbound network policy blocking Docker registry blob downloads
   entirely, not a project misconfiguration. This is a different failure
   class from item 4 and was not worked around — per this environment's
   own operating instructions ("do not retry or route around" a policy
   denial), the right response is to report it, not tunnel past it.
   **The unit-test suite (`mvn test`, 104/104) is completely unaffected
   and was verified green in this session**, since it never touches
   Docker. The IT path (`mvn verify`) is verified *by construction and
   by code inspection* here — correct Spring/Testcontainers wiring,
   correct fixture data honoring foreign keys, assertions that match the
   real service/repository contracts — but its actual green run depends
   on CI (GitHub Actions' hosted runners, which have ordinary outbound
   internet access and a standard Docker Engine unlikely to enforce the
   unusually high API-version floor this sandbox's daemon does).

## Consequences
- `mvn test` (unit suite): 104/104 pass, verified in this session,
  unchanged by this branch.
- `mvn verify` (adds the 2 new ITs): correctly wired and, with the
  `api.version` fix, gets past Docker-client negotiation in this sandbox
  — but cannot complete here because the sandbox blocks Docker registry
  image pulls outright. This is the first branch in this project's
  history where a test path could not be fully live-verified before
  opening the PR; the CI run on the PR itself is the actual gate for
  these two tests, and should be watched rather than assumed green.
- Cassandra, Elasticsearch/Kibana/filebeat, and OpenShift manifests
  remain the only unstarted items from the original Appendix B backend/
  infra track — each is a much larger, standalone slice better scoped as
  its own branch if and when there's a concrete feature that needs it
  (search, cross-service activity feeds, a real deployment target),
  rather than building the infrastructure speculatively ahead of any
  consumer.

## Addendum: a real bug the ITs caught on first CI run
The PR's first CI run failed the `backend` job — but not from anything in
items 4/5 above. GitHub's hosted runner has ordinary Docker and got past
container startup entirely; the actual failure was
`IllegalArgumentException: Could not resolve placeholder
'cors.allowed-origins'` while building `securityConfig`.

`backend/src/test/resources/application.yml` **replaces**, not merges
with, `src/main/resources/application.yml` on the test classpath (Spring
Boot loads exactly one `application.yml` from the classpath root). It only
overrode `jwt.*`, so `cors.allowed-origins` — which has a default in the
main file — silently had none under test. This was invisible until now
because every prior test is either a pure Mockito unit test or a
`@WebMvcTest` slice narrow enough never to instantiate `SecurityConfig`;
`FlywayMigrationIT`/`PaymentAuditTransactionIT` are the first tests in the
suite to boot the full context. Fixed by adding a `cors.allowed-origins`
default to the test override file, alongside the existing `jwt.*` ones.
Verified locally past this point (Spring context now builds cleanly); the
run still hits this sandbox's Docker-registry block afterward as
expected, unrelated to this fix.
