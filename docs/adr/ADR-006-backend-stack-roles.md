# ADR-006: Roles for the distributed backend stack (learning track)

## Status
Accepted (2026-07-04) — implemented across the backend/infra branches

## Context
This project is a learning vehicle; the owner wants hands-on experience with
Kafka, Zookeeper, Cassandra, the ELK stack, Docker and OpenShift, applied
honestly rather than bolted on. The backend must follow 12-factor principles.

## Decision
- **PostgreSQL + Flyway** — transactional core (users, books, loans,
  subscriptions, orders, payments). `ddl-auto: validate`, hand-written
  migrations, no more H2 anywhere.
- **Kafka** — domain events (`loan.*`, `subscription.*`, `book.*`,
  `payment.*`) published via a transactional outbox (dual-write problem is the
  lesson; Debezium CDC documented as the production path). Run in Zookeeper
  mode deliberately for learning, with a KRaft compose profile for comparison.
- **Cassandra** — append-heavy, partition-scoped reads only: per-user activity
  feed, notifications feed, counter-based stats. Never the OLTP core.
- **Elasticsearch + Kibana** — book search index fed from Kafka events
  (replacing SQL LIKE) and centralized ECS-JSON logs shipped via Filebeat.
- **Docker Compose** — one `docker compose up` for the whole stack; Mailpit for
  email. 12-factor: env-only config (hardcoded JWT secret fallback removed),
  stdout logs, stateless processes, disposability.
- **OpenShift** — raw manifests (Deployment/Service/Route, probes on actuator,
  arbitrary-UID images); operators noted as the real-world path for stateful
  workloads.

## Consequences
- Each technology has one honest job and one clear lesson.
- The event backbone is reused by later features (payments, notifications,
  search indexing) with no new plumbing.
