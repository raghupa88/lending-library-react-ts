# Deploying to OpenShift (CodeReady Containers)

These manifests deploy the app tier (backend + frontend) and a minimal
demo Postgres to a local [CRC](https://crc.dev/) cluster. See ADR-027 for
what's deliberately *not* here (Kafka, Cassandra, Elasticsearch) and why.

## Prerequisites

- [CRC](https://crc.dev/crc/latest/getting_started/getting-started/) installed and started:
  ```
  crc setup
  crc start
  eval $(crc oc-env)
  oc login -u developer https://api.crc.testing:6443
  ```
- The `oc` CLI on your `PATH` (installed by `crc-setup`, or separately).
- This repo checked out locally — the builds below run against your
  working copy, not a pushed branch.

## 1. Create a project and the secret

```
oc new-project lending-library

# JWT_SECRET must be 32+ characters; DB_USER/DB_PASSWORD are your choice.
# Never commit real values for these — this is a one-off imperative
# command, not a checked-in Secret manifest.
oc create secret generic lending-library-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=DB_USER=lending \
  --from-literal=DB_PASSWORD="$(openssl rand -base64 24)"
```

## 2. Apply the manifests and build the images

```
oc apply -f deploy/openshift/

# Binary builds package your local working directory and send it to the
# in-cluster build — no external registry or git push needed.
oc start-build backend --from-dir=. --follow
oc start-build frontend --from-dir=. --follow
```

The `image.openshift.io/triggers` annotation on each Deployment updates
its container image automatically once the matching build finishes —
you don't need to `oc set image` or restart anything by hand.

## 3. Wire up CORS once the frontend has a Route

The backend's `CORS_ALLOWED_ORIGINS` isn't known until the frontend's
Route exists (its hostname isn't chosen until then), so this is a
necessary manual step after the first apply:

```
oc set env deployment/backend \
  CORS_ALLOWED_ORIGINS="https://$(oc get route frontend -o jsonpath='{.spec.host}')"
```

## 4. Open the app

```
oc get route frontend -o jsonpath='https://{.spec.host}{"\n"}'
```

## Checking rollout health

```
oc get pods
oc logs deployment/backend -f       # ECS-JSON lines (docker profile, see logback-spring.xml)
oc describe deployment/backend      # readiness/liveness probe status
```

`backend`'s probes hit `/actuator/health/readiness` and
`/actuator/health/liveness` — the same actuator endpoints already used by
`docker-compose.yml`'s healthcheck (ADR-006/007); nothing OpenShift-specific
was added to the app itself to make these work.

## Rebuilding after a code change

```
oc start-build backend --from-dir=. --follow
# or: oc start-build frontend --from-dir=. --follow
```

No `oc apply` needed for a plain code change — only re-run this if you
change the manifests themselves.

## Cleaning up

```
oc delete project lending-library
```
