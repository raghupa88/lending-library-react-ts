# ADR-026: Elasticsearch book search + shipped ECS-JSON logs

## Status
Accepted (2026-07-09)

## Context
Second of the three backend/infra branches this session split Appendix
B's remaining trio into (Cassandra → **Elasticsearch** → OpenShift; see
ADR-025 for why they're split rather than one branch). ADR-008 seeded a
`book.updated` Kafka topic with no consumer specifically "so the
Elasticsearch search-index phase can subscribe without touching the
producers" — this is that phase. Appendix B's other Elasticsearch line
item, "ECS-JSON logs in Kibana," was already half-done: `logback-spring.xml`
has emitted ECS-JSON to stdout under the `docker` profile since ADR-008;
what was missing was something to ship those logs to Elasticsearch and a
Kibana to view them in.

## Decision
1. **`BookDocument` is a narrow index, not a duplicate of `Book`.** It
   carries only what search/filter needs — title/author (full-text),
   category/language (exact-match facets), availableCopies (the
   availability filter). Elasticsearch resolves matching IDs in relevance
   order; `ElasticsearchBookSearchQueryService` still builds the actual
   `BookResponse` content from Postgres via `bookRepository.findAllById`,
   re-ordered to match the search result order. This avoids duplicating
   the whole `Book` schema into the index (a real maintenance burden that
   would need updating in two places forever) while still getting
   fast search/relevance/filtering.
2. **A real Postgres/Elasticsearch split, not Cassandra's Noop pattern.**
   `BookSearchQueryService` has `PostgresBookSearchQueryService`
   (`@Profile("!elasticsearch")`) and `ElasticsearchBookSearchQueryService`
   (`@Profile("elasticsearch")`) — but unlike the Cassandra branch's
   empty-list fallbacks for a genuinely optional activity feed, search has
   no reasonable "empty" default: `GET /books` is the Browse page's core
   experience. The Postgres implementation is just the exact `findWithFilters`
   query this app always had, extracted behind the interface — dev/CI
   without Elasticsearch active get the same real search they always had,
   not a degraded one.
3. **`book.updated`'s payload didn't need to grow.** `BookSearchConsumer`
   re-fetches the full row from Postgres by `aggregateId` (the book's own
   id) rather than needing every searchable field carried in the Kafka
   message — simpler than growing the event schema, and it means the
   producer in `BookService` needed zero changes.
4. **The consumer also subscribes to `loan.created`/`loan.returned`** (not
   just `book.updated`) — borrowing/returning changes `availableCopies`,
   the index's availability-filter field, and the index would silently
   drift stale on every loan without this. `loan.renewed` is explicitly
   ignored (it doesn't change availableCopies).
5. **Re-indexing is "fetch current truth, overwrite the document" —
   deliberately not a delta/increment.** This makes it naturally
   idempotent under Kafka's at-least-once redelivery: replaying the same
   event just overwrites the document with the same current values. No
   `processed_events`-style idempotency table is needed here, unlike
   ActivityConsumer's counter increments (ADR-025) where a delta actually
   would double-count on redelivery.
6. **The `elasticsearch` Spring profile's autoconfigure-exclusion trick
   was applied to *both* `application.yml` files from the start this
   time** — ADR-025 found out the hard way (via a real CI failure) that
   `src/test/resources/application.yml` replaces, not merges with, the
   main config on the test classpath, so an exclusion added only to the
   main file never reaches any test. Elasticsearch's REST client itself
   connects lazily, but its actuator health contributor — wired
   transitively into every bean that depends on the security filterChain,
   the same discovery from ADR-025 — probes the cluster eagerly, so it
   gets the same default-excluded/profile-cancelled treatment as Cassandra.
7. **The index is created by the app on startup (`BookSearchIndexInitializer`,
   an `ApplicationRunner`), not a migration tool.** Elasticsearch has no
   Flyway/CQL-equivalent JVM migration library in this stack; "create the
   index from the annotated document if it doesn't exist yet" is the
   idiomatic substitute, checked via `IndexOperations.exists()` so it's
   safe to run on every startup.
8. **Filebeat ships the backend's existing ECS-JSON stdout logs to
   Elasticsearch via Docker log autodiscovery**, viewable in Kibana. This
   only works as written on a Linux Docker host, where
   `/var/lib/docker/containers` is directly readable from another
   container — Docker Desktop (Mac/Windows) runs Docker inside its own VM,
   so that path isn't visible the same way. This is a real, documented
   limitation of the docker-log-autodiscovery approach, not something this
   compose file works around; a Docker-Desktop setup would need Filebeat's
   own container-log-forwarding image or a host-level log shipper instead.
9. **Security disabled on the Elasticsearch container** (`xpack.security.enabled:
   false`) — this is a local dev/demo stack, not a production cluster; a
   real deployment would enable it and give Filebeat/Kibana real
   credentials rather than an anonymous connection.
10. **No frontend changes.** `GET /books`'s query-param contract
    (`search`, `category`/`genre`, `language`, `available`, `page`, `size`)
    is unchanged — this branch swaps what answers it behind the scenes,
    transparently to the Catalog page and its existing e2e specs.

## Consequences
- Backend: full `mvn test` suite passes (197 tests, +6 new —
  `PostgresBookSearchQueryServiceTest`, `ElasticsearchBookSearchQueryServiceTest`,
  and `BookSearchConsumerTest`'s four cases covering `book.updated`, a
  deleted book, `loan.created`, and `loan.renewed` being ignored).
  A new `ElasticsearchSearchIT` (Testcontainers, `mvn verify`/CI-only per
  ADR-015's split) proves the index mapping and search/filter path work
  against a real cluster — same job `FlywayMigrationIT`/`CassandraSchemaIT`
  do for their stores.
- Frontend: no source changes; `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run build`, and the full e2e suite all still pass
  unchanged, confirming the backend swap really is transparent to the
  Catalog page and its specs.
- No Docker daemon in this environment (same caveat ADR-008/ADR-025
  noted) — `ElasticsearchSearchIT` cannot be run interactively here; it
  runs in CI, where the Cassandra branch's real Testcontainers Cassandra
  cluster already proved Docker + Testcontainers modules work. Any
  cluster-specific surprises (a wrong field-naming assumption, the way
  ADR-025's `book_id`/`bookid` mismatch surfaced) will be diagnosed and
  fixed the same way that branch's were — from real CI failures, not
  guessed away preemptively.
- The last Appendix B item — OpenShift manifests, probes, arbitrary-UID
  images, CRC docs — is the next and final branch in this session's
  backend/infra track.
