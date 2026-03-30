# Stage 5C read substrate (API ownership)

This document is the **canonical map** of how `GET` (and read-shaped) API routes source data after Stage 5C. It is derived from `internal/server/server.go` and `internal/dataplane`.

**Principles**

- **Dataplane snapshots** are the default substrate for the main **namespaced list** surfaces the UI uses as anchors.
- **Projections** assemble answers from those snapshots (and metadata composition only)—no hidden live `kube` calls inside projection builders.
- **Direct cluster reads** remain **explicit exceptions**: details, events, YAML (where present), relation lookups, deferred list families, cluster-scoped RBAC/storage APIs, and a few namespace helpers.

For a short architecture narrative, see the **Stage 5C end state** section in `docs/STAGE5_CLOSURE.md`.

---

## 1. Dataplane snapshot–backed (list envelope)

These routes use `DataPlaneManager.*Snapshot` and `writeDataplaneListResponse`. Each response includes `active`, `items`, `observed`, and `meta` (`freshness`, `coverage`, `degradation`, `completeness`, `state`).

| Route pattern | Snapshot / notes |
|---------------|------------------|
| `GET /api/namespaces/{ns}/pods` | `PodsSnapshot`; list rows may include projection-derived fields (`restartSeverity`, `listHealthHint`) from `EnrichPodListItemsForAPI`. |
| `GET /api/namespaces/{ns}/deployments` | `DeploymentsSnapshot`; optional `EnrichDeploymentListItemsForAPI` fields. |
| `GET /api/namespaces/{ns}/daemonsets` | `DaemonSetsSnapshot` |
| `GET /api/namespaces/{ns}/statefulsets` | `StatefulSetsSnapshot` |
| `GET /api/namespaces/{ns}/replicasets` | `ReplicaSetsSnapshot` |
| `GET /api/namespaces/{ns}/jobs` | `JobsSnapshot` |
| `GET /api/namespaces/{ns}/cronjobs` | `CronJobsSnapshot` |
| `GET /api/namespaces/{ns}/services` | `ServicesSnapshot` |
| `GET /api/namespaces/{ns}/ingresses` | `IngressesSnapshot` |
| `GET /api/namespaces/{ns}/persistentvolumeclaims` | `PVCsSnapshot` |
| `GET /api/namespaces/{ns}/configmaps` | `ConfigMapsSnapshot` |
| `GET /api/namespaces/{ns}/secrets` | `SecretsSnapshot` |

Underlying list IO is still `kube.List*` **inside** the dataplane snapshot executor (scheduler, cache, normalization)—not in the HTTP handler.

---

## 2. Dataplane snapshot–backed (custom JSON shape)

| Route | Behavior |
|-------|----------|
| `GET /api/namespaces` | **Stage 1:** `NamespacesSnapshot` list only — response returns items immediately with `rowProjection.revision` / `loading`. **Stages 2–3** run in background (cancelled when a newer list starts): live **GET** per selected namespace (`GetNamespaceListFields`), then **pods + deployments** dataplane snapshots (`WorkPriorityLow`). Which namespaces are selected is **scored from optional query hints**, not an alphabetical walk of the full list (see §2.1). UI polls `GET /api/namespaces/enrichment?revision=…` for merged rows. |
| `GET /api/dashboard/cluster` | `EnsureObservers` + `DashboardSummary`: `visibility` (namespaces/nodes snapshots + observed-at), `resources` and `hotspots` (bounded alphabetical namespace sample — pods/deployments/services/ingresses/PVCs), plus `workloadHints` alias for chips. |
| `GET /api/namespaces/enrichment?revision=` | Server-side merge snapshot for progressive namespace list rows (same revision as `rowProjection.revision` from `GET /api/namespaces`). Includes `enrichTargets` (count of namespaces in the scored enrichment subset). Not a direct kube call; reflects in-process background work. |

### 2.1 Namespace list: enrichment hints, scoring, and idle worker

Background row enrichment for the namespaces table is intentionally **narrow and user-aligned**:

- **No alphabetical cluster scan** for enrichment targets. The handler takes the current list snapshot order from `NamespacesSnapshot` and intersects it with names implied by hints.
- **Optional query parameters** (parsed in `internal/dataplane` as `ParseNamespaceEnrichHints`):
  - `enrichFocus` — current namespace (UI selection).
  - `enrichRecent` — MRU names, comma-separated and/or repeated keys; earlier names in the combined list are treated as more recent.
  - `enrichFav` — favourite names, comma-separated and/or repeated keys.
- **Scoring** (`buildEnrichmentWorkOrder`): focus ≫ favourite ≫ recency (recency uses position in the recent list). Sort by score descending; **ties break by snapshot list index** (stable, not A–Z).
- **Cap:** at most **32** namespaces receive GET + pods/deployments enrichment; up to **2** in parallel (`nsEnrichMaxParallel`).
- **Idle-only start:** the worker waits until the API has seen **no user activity** for **2s** (`nsEnrichIdleQuiet`). Activity is updated on `/api/*` **except** `GET /api/namespaces/enrichment` (trimmed path), so enrichment polling does not reset the idle timer.

**UI:** the list URL is built in `ui/src/state.ts` as `namespacesListApiPath`, using persisted `recentNamespacesByContext` (updated when the user picks a namespace) and `favouriteNamespacesByContext`. The Namespaces table passes that path into `fetchRows` so list load and hints stay aligned.

---

## 3. Projection-backed (no handler-level kube list for summary body)

| Route | Behavior |
|-------|----------|
| `GET /api/namespaces/{name}/summary` | `NamespaceSummaryProjection`: counts, health rollups, `restartHotspots`, `workloadByKind`, and `NamespaceSummaryMetaDTO` are built from dataplane namespace-scoped snapshots. **Helm** fields stay empty until a Helm snapshot exists. |

---

## 4. Explicit direct-read exceptions (kube in handler)

### 4.1 Namespace helpers

| Route | Reason |
|-------|--------|
| `GET /api/namespaces/{name}` | Namespace **detail** (intentional direct read). |
| `GET /api/namespaces/{name}/resourcequotas` | Not yet owned by dataplane; low-frequency operational surface. |

### 4.2 Namespaced lists deferred in 5C

| Route | Reason |
|-------|--------|
| `GET /api/namespaces/{ns}/serviceaccounts` | Deferred list migration. |
| `GET /api/namespaces/{ns}/roles` | Deferred list migration. |
| `GET /api/namespaces/{ns}/rolebindings` | Deferred list migration. |
| `GET /api/namespaces/{ns}/helmreleases` | Deferred (Helm semantics / snapshot ownership TBD). |
| `GET /api/helmcharts` | Cluster-scoped Helm catalog; direct read. |

### 4.3 Cluster-scoped families (not dataplane-backed in 5C)

| Routes (representative) | Notes |
|-------------------------|--------|
| `GET /api/nodes`, `GET /api/nodes/{name}` | Node list/detail direct read. **Dashboard** still uses dataplane’s **cached** node snapshot for summary counts/metadata. |
| `GET /api/clusterroles`, `…/{name}`, events, yaml | RBAC cluster scope. |
| `GET /api/clusterrolebindings`, … | Same. |
| `GET /api/customresourcedefinitions`, … | CRD cluster scope. |
| `GET /api/persistentvolumes`, … | Storage cluster scope. |

### 4.4 Detail, events, YAML, relations (for all kinds)

For resources that have them, these patterns remain **direct** `kube` reads:

- `GET …/{resource}/{name}` (detail)
- `GET …/{name}/events`
- `GET …/{name}/yaml` (**only where the route exists**—not every kind exposes YAML in kview)
- Examples of **relation** reads: `GET …/pods/{name}/services`, `GET …/services/{name}/ingresses`
- `GET …/serviceaccounts/{name}/rolebindings`

### 4.5 Non–dataplane product APIs

| Route | Substrate |
|-------|-----------|
| `GET /api/healthz`, `GET /api/contexts` | Server / cluster manager. |
| `GET /api/activity`, `GET /api/activity/{id}/logs` | Runtime registry / logs. |
| `GET /api/sessions`, `GET /api/sessions/{id}` | Session manager. |
| `GET …/logs/ws`, `GET …/terminal/ws` | Streaming (not snapshot reads). |
| `POST /api/auth/can-i` | SSA review (write-shaped but read of authz). |

---

## 5. Stage 5C truthful claim

> For the main **namespaced list** read surfaces used as UI anchors (workloads, services, networking, storage, config secrets), **dataplane snapshots** are the default substrate, with **list metadata** on every migrated list. **Namespace summary** is **projection-led** from those snapshots. Remaining handler-level kube reads are **limited, intentional exceptions** (details, events, YAML, relations, deferred lists, cluster-scoped families, Helm, quotas).

---

## 6. Maintenance

When adding a route:

1. Decide: snapshot list, projection, or direct exception.
2. Update this file in the same PR if the route is user-facing under `/api`.
3. Do **not** add silent `kube` calls inside projection code paths; keep exceptions visible in handlers (or in dataplane snapshot executors only).
