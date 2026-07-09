# ADR-025: Cassandra query-first activity feed + counter stats

## Status
Accepted (2026-07-09)

## Context
Fifth and final item on the user's explicit priority order (referral
credits → gift subscriptions → Tamil localization phase 1 → B2B tier →
**backend/infra**). Appendix B's backend/infra track has three remaining
pieces — Cassandra, Elasticsearch/Kibana, and OpenShift manifests
(Postgres/Flyway/Kafka were already done in ADR-007/ADR-008). Given how
large all three are together, this session splits them into three
sequential branches, the same way the "Suvadi Learn" epic shipped across
six branches rather than one. This is the first: Cassandra.

ADR-008 (Kafka) deliberately seeded a `book.updated` topic with no
consumer "so the Elasticsearch search-index phase can subscribe without
touching the producers" — that phase is next. This branch's own job is
the two things Appendix B named for Cassandra: **query-first tables**
(`activity_by_user`, `notifications_by_user`-equivalent, counter stats)
and the M6 Dashboard's long-deferred **"Activity" tab** ("Notifications
(later), Activity (later)" in the original plan — Notifications shipped
in ADR-008 as the navbar bell; Activity had no consumer until now).

## Decision
1. **Two query-first tables, not a relational redesign.** `activity_by_user`
   (partition key `user_id`, clustered by `occurred_at DESC` — "this
   user's recent activity, newest first" touches exactly one partition)
   and `book_borrow_counts` (a genuine counter column, not a read-modify-
   write integer — "how many times has this book been borrowed"). Both
   are additive, denormalized read models fed by the same Kafka topics
   ADR-008 already produces; nothing about the existing Postgres schema
   changes.
2. **A second Kafka consumer (`ActivityConsumer`), not an extension of
   `NotificationConsumer`.** It subscribes to the same five topics plus
   `PAYMENT_EVENTS` (seeded by `PaymentService` since the payments phase
   but never consumed until now) under its own consumer group
   (`"activity-feed"`, not `"notifications"`) so both consumers get an
   independent full copy of every event instead of competing for
   partitions within one group.
3. **Its own idempotency table (`processed_activity_events`), deliberately
   not the shared `processed_events` table.** That table is keyed only by
   `event_id` with no consumer discriminator — if two independent
   consumer groups both checked it, whichever processed an event first
   would mark it "done" globally, silently starving the other. This is a
   latent bug the single-consumer design never had to face; giving the
   new consumer its own table sidesteps it without retrofitting a
   composite key onto the existing one. (The activity row write is
   naturally idempotent on redelivery — its primary key is the event's
   own id — but the counter increment is not, since a counter accumulates
   deltas; the idempotency table is what actually matters here.)
4. **Cassandra's auto-configuration is excluded by default and only
   cancelled under the `cassandra` profile — unlike Kafka.** Kafka
   producer/consumer beans connect lazily (on first send/poll), so
   `spring-kafka` sits inertly on the classpath in every other profile.
   Building a Cassandra `CqlSession` bean is different: it connects
   **synchronously** at bean-creation time and fails startup outright if
   nothing answers the contact point. Leaving Cassandra's auto-
   configuration enabled by default would have broken every existing
   test and dev/CI run the moment the dependency was added. `application.yml`
   excludes `CassandraAutoConfiguration` / `CassandraDataAutoConfiguration`
   / `CassandraRepositoriesAutoConfiguration` unconditionally, then the
   `cassandra` profile's document re-enables them with `exclude: []`
   (Spring Boot profile documents override, not merge, for the same key).
5. **The schema is a plain CQL script (`cql/schema.cql`) applied by a
   one-shot `cassandra-init` compose service, not `schema-action:
   create_if_not_exists`.** Same "migrations own the schema, the ORM
   doesn't auto-DDL it" stance ADR-007 established for Postgres/Flyway
   (`ddl-auto: validate`), translated to Cassandra's idiom since there's
   no Flyway-equivalent JVM migration library wired up here. Cassandra's
   official image has no `docker-entrypoint-initdb.d` convention like
   Postgres, so `cassandra-init` just runs `cqlsh -f schema.cql` once
   against the now-healthy node and exits; `backend` depends on it with
   `condition: service_completed_successfully`.
6. **Two new read endpoints, each with a Cassandra-backed implementation
   and a no-op empty-list fallback**, selected by the same `cassandra`
   profile: `GET /activity/me` (`ActivityQueryService` /
   `CassandraActivityQueryService` / `NoopActivityQueryService`) and
   `GET /admin/books/trending` (`TrendingBooksQueryService` and its pair).
   This mirrors the project's existing stance on optional infrastructure
   — mail being a best-effort side channel, the mail health indicator
   being disabled so a transient SMTP outage can't flip readiness DOWN —
   applied to a read path this time: dev/CI/test never need a live
   Cassandra cluster just to load the Dashboard or Admin Overview, they
   just see empty states.
7. **Counter tables can't be `ORDER BY`'d on the counter value in CQL**
   (no secondary index support for counters). `CassandraTrendingBooksQueryService`
   reads every row and sorts in the app — acceptable at this catalog's
   size; a much larger catalog would need a periodic batch job into a
   separate ranked table instead.
8. **Frontend**: Dashboard gets a fourth tab, "Activity" — the tab the
   original design table stubbed as "(later)" — listing `entry.summary`
   strings with relative timestamps, with the same empty state dev/CI
   will actually see. Admin Overview gets a "Trending books" card fed by
   `/admin/books/trending`, same empty-state treatment.

## Errors found and fixed
- **`backend/src/test/resources/application.yml` replaces — not merges
  with — the main `application.yml` on the test classpath** (its own
  header comment says so). The `spring.autoconfigure.exclude` addition to
  the main file therefore never reached any test, including the existing
  `FlywayMigrationIT`/`PaymentAuditTransactionIT`, which broke on the
  first CI run with a `CqlSession` connection failure cascading up through
  the actuator health-contributor registry into `SecurityConfig`'s
  `filterChain` bean (every non-Cassandra-aware `@SpringBootTest` that
  boots the real app depends on it transitively). Fixed by repeating the
  same exclusion list in the test-classpath file, per its own documented
  policy.
- `CassandraSchemaIT` originally used `@ActiveProfiles("cassandra")` to
  pick up the `cassandra` profile's `keyspace-name`/exclude-cancelling
  block from the main `application.yml` — which, for the same
  file-replacement reason above, never applied either. CI's real
  Testcontainers Cassandra container connected successfully (proving the
  container/init-script mechanics work), but every query failed with "No
  keyspace has been specified." Fixed by dropping the profile dependency
  entirely and setting `spring.cassandra.keyspace-name` plus clearing
  `spring.autoconfigure.exclude` directly via `@TestPropertySource`, which
  always wins regardless of which `application.yml` is in play.
- With those two fixed, CI's real Testcontainers Cassandra container
  caught a genuine mapping bug: `BookBorrowCount.bookId`'s `@PrimaryKey`
  had no explicit column name, so Spring Data Cassandra's default naming
  strategy derived `bookid` (it lowercases but doesn't insert underscores
  at camelCase boundaries) while `cql/schema.cql` defines the column as
  `book_id` — every read/write through the entity (not the raw `@Query`
  increment, which spells the column out literally) failed with "Undefined
  column name bookid." Fixed with `@PrimaryKey("book_id")`, matching the
  explicit `name = "..."` already given to every column on
  `ActivityEntryKey` (whose test passed on the first real-Cassandra run,
  confirming that entity's mapping was correct from the start).

## Consequences
- Backend: full `mvn test` suite passes (191 tests, +15 new: `ActivityConsumerTest`
  covering every event type plus redelivery/idempotency, `CassandraActivityQueryServiceTest`,
  `NoopActivityQueryServiceTest`, `CassandraTrendingBooksQueryServiceTest`
  including a deleted-book-is-skipped case, `NoopTrendingBooksQueryServiceTest`).
  A new `CassandraSchemaIT` (Testcontainers, `mvn verify`/CI-only per
  ADR-015's split) proves `cql/schema.cql` and the Spring Data Cassandra
  entity mappings round-trip against a real engine and that the counter
  increments correctly — the same job `FlywayMigrationIT` does for Postgres.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass.
- e2e: 4 new specs (2 in `dashboard.spec.ts` for the Activity tab's empty
  and populated states, 2 in `admin.spec.ts` for the Trending books card)
  — full suite (217 specs) passes with no regressions.
- Live-verified against a real running backend (no Docker daemon in this
  environment, so — like ADR-008's Kafka broker — end-to-end Cassandra
  delivery via `docker compose up` is a checklist item, not something this
  session could exercise directly): started the app on the default (H2,
  no `cassandra` profile) profile and confirmed `GET /activity/me` and
  `GET /admin/books/trending` both return `{"success":true,"data":[]}`
  rather than erroring, and that borrowing a book still works end-to-end
  unaffected by the new consumer/event wiring — proving the profile-
  exclusion trick in decision 4 actually works and this branch is inert
  everywhere except a `cassandra`-profile deployment.
- Remaining Appendix B items — Elasticsearch/Kibana book search (the
  `book.updated` topic ADR-008 seeded for exactly this) and OpenShift
  manifests — are the next two branches in this session's backend/infra
  track.
