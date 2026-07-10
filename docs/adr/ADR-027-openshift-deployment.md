# ADR-027: OpenShift deployment manifests

## Status
Accepted (2026-07-09)

## Context
Third and final of the three backend/infra branches this session split
Appendix B's remaining trio into (Cassandra → Elasticsearch → **OpenShift**).
The original scope was "OpenShift manifests (`deploy/openshift/`), probes,
arbitrary-UID images, CRC docs." Two of those four items turned out to
already be done: `backend/Dockerfile` already runs as a non-root,
arbitrary-UID-friendly user (`chown -R 1001:0 && chmod -R g=u`, explicitly
commented "OpenShift compatible") and the root `Dockerfile` already uses
`nginxinc/nginx-unprivileged`, both from the original Docker/backend-
hardening branch. This branch's actual job is the manifests, the probes
wiring, and the CRC docs.

## Decision
1. **Scope: app tier + a minimal demo Postgres only — not Kafka, Cassandra,
   or Elasticsearch.** CRC is a single-node, resource-constrained local
   cluster; running the full stack (Postgres + Kafka/Zookeeper + Cassandra
   + Elasticsearch + Kibana + backend + frontend) on it isn't realistic,
   and a real OpenShift deployment of any of those three would use a
   dedicated operator (Strimzi for Kafka, a Cassandra operator, ECK for
   Elasticsearch) rather than bare Deployments anyway — building
   hand-rolled manifests for infrastructure that has a well-established
   operator story would be exactly the kind of speculative complexity this
   project has consistently avoided (see ADR-015's identical reasoning for
   why it scoped to just Postgres ITs).
2. **Plain `apps/v1 Deployment` + an `image.openshift.io/triggers`
   annotation, not the deprecated `DeploymentConfig`.** `DeploymentConfig`
   is OpenShift-only and has built-in ImageStream triggers, but it's a
   legacy API Red Hat has been moving away from since OpenShift 4. A plain
   Deployment has no native trigger, so the annotation replicates the same
   auto-update-on-build behavior: OpenShift's image-trigger controller
   patches the container's `image` field to the ImageStream's resolved
   registry path whenever `backend:latest`/`frontend:latest` changes,
   without needing a namespace-specific registry path hardcoded into the
   manifest (a real mistake I caught before committing: an earlier draft
   used a literal `${NAMESPACE}` placeholder in the image field, which
   plain `oc apply` never substitutes — that's Template/`oc process`
   syntax, not a Kubernetes manifest feature).
3. **`Binary` `BuildConfig`s (`oc start-build --from-dir=.`), not a
   `git`-source build.** This is a local CRC demo of a repo checked out on
   the developer's own machine — a binary build packages the working
   directory directly, with no requirement to have pushed anything or
   configured a webhook/pull secret for this repo's own git host.
4. **Probes reuse the existing actuator endpoints outright — nothing new
   in the app.** `/actuator/health/readiness` and `/actuator/health/liveness`
   have been exposed since ADR-006/007 (`management.endpoint.health.probes.enabled:
   true`), already used by `docker-compose.yml`'s own healthcheck. The
   OpenShift manifest's probes are the exact same URLs; the "probes" line
   item in Appendix B turned out to be "point Kubernetes at what already
   exists," not new instrumentation.
5. **Secrets are created imperatively (`oc create secret generic ...`),
   never committed as YAML with placeholder values.** Same 12-factor,
   no-baked-in-secrets stance as `JWT_SECRET`'s fail-fast startup check
   (ADR-004/007) and `.env.example`'s `change-me` placeholders — a
   committed Secret manifest, even with obviously-fake values, risks
   someone applying it verbatim and believing it's secure.
6. **The demo Postgres Deployment is explicitly *not* a template for a
   real deployment** (documented in its own header comment): it uses the
   plain upstream `postgres:16-alpine` image, which isn't itself built for
   OpenShift's restricted SCC's arbitrary UID (it expects to `chown` its
   data directory at startup) — `PGDATA` is set to a subdirectory of the
   mounted volume as a narrow workaround for the most common failure mode
   of that mismatch (a freshly-provisioned PVC's root directory already
   being root-owned), not a general fix. A real deployment would use an
   OpenShift-certified Postgres image or a managed/operator-backed
   database instead of patching around the upstream image like this.
7. **`CORS_ALLOWED_ORIGINS` is wired up as a documented manual step after
   the first apply, not baked into the ConfigMap.** The frontend's Route
   hostname isn't chosen until the Route itself is created (CRC/OpenShift
   assigns it), so there's a genuine chicken-and-egg here no static
   manifest value could resolve; the README documents the one-line
   `oc set env` fix-up.

## Consequences
- No test suite exercises YAML manifests, and no CI job references
  `deploy/openshift/` — this branch adds no risk to the existing
  backend/frontend/e2e CI checks, unlike the Cassandra/Elasticsearch
  branches' new Testcontainers ITs.
- All three manifest files parsed successfully with `yaml.safe_load_all`
  (`00-postgres.yaml`: PVC + Deployment + Service; `01-backend.yaml`:
  ImageStream + BuildConfig + ConfigMap + Deployment + Service + Route;
  `02-frontend.yaml`: ImageStream + BuildConfig + Deployment + Service +
  Route) — no `oc`/`kubectl` binary is available in this environment, so
  a real `oc apply`/CRC rollout is a checklist item for whoever runs this
  next (the same caveat ADR-008/025/026 gave for Kafka/Cassandra/Elasticsearch
  requiring a real cluster/broker this session couldn't exercise directly).
- This is the last item in the user's stated priority order
  (referral credits → gift subscriptions → Tamil localization phase 1 →
  B2B tier → backend/infra, itself split into Cassandra → Elasticsearch →
  **OpenShift**). No further backlog items remain from that list.
