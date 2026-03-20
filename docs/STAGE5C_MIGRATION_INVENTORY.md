# Stage 5C Migration Inventory (Wave 5C)

This inventory classifies remaining direct `kube` reads (in `internal/server/server.go`) into three buckets:

- `migrate_now`: namespaced list surfaces that are high-value UI anchors and should become dataplane-backed first.
- `keep_direct_for_now`: direct reads that are intentionally low-risk to keep while we migrate list surfaces.
- `postpone`: cluster-scoped families and Helm surfaces that should wait for later waves.

Notes:
- “Current source” is based on which handler calls `s.dp.<...Snapshot>` / `writeDataplaneListResponse` (dataplane) vs calling `kube.<...>` directly (direct read).
- Details/events/yaml are treated separately even if their parent “list” surface is migrated later.

---

## migrate_now

| Endpoint group (route pattern) | Current source | Why 5C now | Likely owner wave |
|---|---|---|---|
| `GET /api/namespaces/{ns}/daemonsets` | `kube.ListDaemonSets` (direct read) | Matches the “list surface” pattern already being dataplane-backed for pods/deployments; enables consistent list-level metadata (`observed`, freshness, coverage, degradation, completeness, state`) in the namespace drawer. | 5C Wave 1 |
| `GET /api/namespaces/{ns}/statefulsets` | `kube.ListStatefulSets` (direct read) | Same UI anchor value and consistent list pagination/metadata expectations as other first-wave kinds. | 5C Wave 1 |
| `GET /api/namespaces/{ns}/jobs` | `kube.ListJobs` (direct read) | Jobs are a common “workload health” surface; list-level metadata is more valuable than detail-level reads for deciding whether to expand. | 5C Wave 1 |
| `GET /api/namespaces/{ns}/cronjobs` | `kube.ListCronJobs` (direct read) | CronJobs are a frequent operational surface; list-level metadata reduces “unknown freshness” UX. | 5C Wave 1 |
| `GET /api/namespaces/{ns}/replicasets` (maybe) | `kube.ListReplicaSets` (direct read) | Similar to Deployments/Pods list behavior; consider after daemonsets/statefulsets/jobs/cronjobs to avoid expanding too many kinds at once. | 5C Wave 2+ (conditional) |

---

## keep_direct_for_now

These endpoints are expected to remain direct reads for now because they are either:
- detail/secondary views that typically don’t require dataplane list metadata, or
- operational UX helpers (events/yaml/preflight) that should not block list migration, or
- relation lookups that can remain lightweight direct reads until later waves explicitly snapshot-backed them.

### Details endpoints (by resource)

The following “detail” routes are direct reads today (`kube.Get*Details`):

- `GET /api/namespaces/{ns}/daemonsets/{name}`
- `GET /api/namespaces/{ns}/daemonsets/{name}/events`
- `GET /api/namespaces/{ns}/statefulsets/{name}`
- `GET /api/namespaces/{ns}/statefulsets/{name}/events`
- `GET /api/namespaces/{ns}/jobs/{name}`
- `GET /api/namespaces/{ns}/jobs/{name}/events`
- `GET /api/namespaces/{ns}/cronjobs/{name}`
- `GET /api/namespaces/{ns}/cronjobs/{name}/events`
- `GET /api/namespaces/{ns}/replicasets/{name}`
- `GET /api/namespaces/{ns}/replicasets/{name}/events`
- (also applies broadly to other kinds; example dataplane-backed list kinds keep direct detail reads today, e.g. pods/deployments/services)

### YAML endpoints

The following YAML routes are direct reads today (`kube.Get*YAML`):

- `GET /api/clusterroles/{name}/yaml`
- `GET /api/clusterrolebindings/{name}/yaml`
- `GET /api/customresourcedefinitions/{name}/yaml`
- `GET /api/persistentvolumes/{name}/yaml`
- `GET /api/namespaces/{ns}/daemonsets/{name}/yaml`
- `GET /api/namespaces/{ns}/statefulsets/{name}/yaml`
- `GET /api/namespaces/{ns}/serviceaccounts/{name}/yaml`
- `GET /api/namespaces/{ns}/roles/{name}/yaml`
- `GET /api/namespaces/{ns}/rolebindings/{name}/yaml`
- `GET /api/namespaces/{ns}/persistentvolumeclaims/{name}/yaml`

Why keep direct: YAML is inherently “render-on-demand” and typically not a stable list anchor. We can migrate snapshot ownership later if needed for consistency or RBAC clarity.

### Events endpoints

Events remain direct reads (`kube.ListEventsForObject`), e.g.:

- `GET /api/namespaces/{ns}/pods/{name}/events`
- `GET /api/namespaces/{ns}/deployments/{name}/events`
- `GET /api/namespaces/{ns}/daemonsets/{name}/events`
- `GET /api/namespaces/{ns}/statefulsets/{name}/events`
- `GET /api/namespaces/{ns}/jobs/{name}/events`
- `GET /api/namespaces/{ns}/cronjobs/{name}/events`
- `GET /api/namespaces/{ns}/replicasets/{name}/events`

Why keep direct: events are high-churn; caching/snapshot semantics are a later concern and should not complicate this wave.

### Action-related preflight reads

Preflight capability checks are direct reads today (`kube.CheckCapabilities`):

- `POST /api/capabilities`

Why keep direct: this is a capability learning surface, and it’s orthogonal to list snapshot migrations.

### Relation lookups

These relation lookups are direct reads today (`kube.List*For*`):

- `GET /api/namespaces/{ns}/pods/{name}/services`
- `GET /api/namespaces/{ns}/services/{name}/ingresses`

Why keep direct: relationship expansions can be treated as lightweight derivations until later waves explicitly introduce dataplane snapshot ownership for those relations.

---

## postpone / explicit exception

### Cluster-scoped list/detail families not yet in dataplane

The following cluster-scoped list/detail endpoints are direct reads today (`kube.List*` / `kube.Get*Details`):

- `GET /api/nodes`
- `GET /api/nodes/{name}`
- `GET /api/clusterroles`
- `GET /api/clusterroles/{name}`
- `GET /api/clusterrolebindings`
- `GET /api/clusterrolebindings/{name}`
- `GET /api/customresourcedefinitions`
- `GET /api/customresourcedefinitions/{name}`
- `GET /api/persistentvolumes`
- `GET /api/persistentvolumes/{name}`

Why postpone: these are cluster-scoped and may require additional observation scope/ownership decisions. Keep wave scope bounded to namespaced list anchors.

### Helm surfaces (explicit exception)

Helm UI surfaces are postponed for now and treated as exceptions to any “list migration” push:

- `GET /api/namespaces/{ns}/helmreleases`
- `GET /api/namespaces/{ns}/helmreleases/{name}`
- `GET /api/helmcharts`
- `POST /api/helm/install`
- `POST /api/helm/upgrade`
- `POST /api/helm/uninstall`
- `POST /api/helm/reinstall`

Why postpone: Helm behavior is operationally sensitive; snapshot ownership would require careful semantics to avoid misleading freshness/state.

