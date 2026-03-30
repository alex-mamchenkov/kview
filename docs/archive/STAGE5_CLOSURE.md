# Stage 5 closure notes

This file records **Stage 5C end state** (current) and retains the **Stage 5A** closure narrative below for history.

---

## Stage 5C end state (closure wave — current)

### What we claim (truthful)

> For the main **namespaced list** surfaces used as UI anchors, **dataplane snapshots** are the default read substrate with scheduler-mediated cache and **list metadata** on every migrated route. **Namespace summary** is **projection-led** from those snapshots only (handler does not call `kube.GetNamespaceSummary`). Remaining handler-level `kube` reads are **limited, intentional exceptions** (details, events, YAML where exposed, relation lookups, deferred lists, cluster-scoped families, namespace detail/quotas, Helm).

### Architecture (short, operator/developer-facing)

- **Raw snapshots** live in `internal/dataplane` per cluster plane; acquisition uses `kube.List*` **inside** snapshot execution, not scattered in handlers for migrated lists.
- **Projections** (e.g. namespace summary) are first-class: they **compose** snapshot outputs and metadata; they do not hide extra live cluster reads.
- **Handlers** should use snapshot/projection-backed paths for normal list and summary UI surfaces; **direct** reads are reserved for exceptions and should stay **obvious** in `server.go`.
- **Route map:** `docs/STAGE5C_READ_SUBSTRATE.md` — update it when adding or changing `/api` read behavior.

### Docs index

| Document | Role |
|----------|------|
| `docs/STAGE5C_READ_SUBSTRATE.md` | Canonical GET/read ownership table |
| `docs/STAGE5_STATUS.md` | Subsystem behavior, observers, metadata |
| `docs/STAGE5C_MIGRATION_INVENTORY.md` | Migration buckets + deferred lists |

### Known gaps (not faked as “complete dataplane”)

- **Node list API** (`GET /api/nodes`) is still a **direct** handler read; the **dashboard** uses the dataplane **nodes snapshot** for summary. Full alignment would be a follow-up.
- **Helm** list/detail and **RBAC-ish** lists (serviceaccounts, roles, rolebindings) remain direct or deferred.
- **Resource quotas** list is direct.

### Functional completeness

**Stage 5C is functionally complete** for its scope: namespaced workload/network/storage/config **lists** + namespace **summary projection** + dashboard **summary** + honest documentation of exceptions. Full cluster parity and Helm/RBAC list migration are **out of scope** for 5C.

---

# Stage 5A Closure (historical)

This section is the final closure status for **Stage 5A** as originally written.

Stage 5A was intended to establish the read-side architectural foundation for a policy-driven, RBAC-aware, proxy-tolerant, multi-cluster dataplane without broad feature expansion.

The goal of this stage was not "move every read behind the dataplane". The goal was to make the boundary real, make the first owned surfaces real, and make partial ownership honest.

## Intended Scope

Stage 5A intended to introduce:

- a dedicated `internal/dataplane` subsystem
- per-cluster planes
- scheduler-mediated read snapshots
- normalized read error semantics
- capability learning from read outcomes
- bounded observer lifecycle
- a small operator-visible dataplane dashboard
- first projection-backed namespace behavior

It did not intend to finish full dataplane migration for every resource endpoint.

## Fully Implemented In Stage 5A

- `internal/dataplane` is the read-side boundary for dataplane contracts, snapshots, observers, normalization, and projection metadata.
- One cluster plane is created lazily per kube context.
- Scheduler-mediated snapshots are active for:
  - namespaces
  - nodes
  - namespace-scoped pods
  - namespace-scoped deployments
- Read errors are normalized into explicit coarse classes such as:
  - `access_denied`
  - `unauthorized`
  - `proxy_failure`
  - `connectivity`
  - `timeout`
  - `rate_limited`
  - `transient_upstream`
- Capability learning is active for dataplane-owned reads and records:
  - state
  - provenance
  - confidence
  - timestamps
- Observer lifecycle exists for:
  - namespaces
  - nodes
- Observer activation is lazy and endpoint-driven for the active context.
- Observer state transitions are logged to the runtime log buffer.
- `/api/dashboard/cluster` is dataplane-backed.
- `/api/namespaces` is dataplane-backed.
- Namespace summary has since moved to **full projection-led** implementation in Stage 5C (see above).

## Active Runtime Behavior Versus Contract Placeholders

These are real runtime behaviors today:

- profile: `focused`
- discovery mode: `targeted`
- activation mode: lazy endpoint-driven startup
- scope: default empty scope, which currently means cluster-wide namespace and node snapshots plus on-demand namespace snapshots for pods and deployments

These enums exist as architectural contract placeholders only in Stage 5A:

- profiles: `manual`, `balanced`, `wide`, `diagnostic`
- discovery modes: `passive`, `adaptive`

They are intentionally documented in code to preserve the intended architecture, but they are not selectable or fully implemented runtime behavior in this stage.

## Dataplane-Backed Endpoints And Surfaces (evolved)

See **`docs/STAGE5C_READ_SUBSTRATE.md`** for the current route map. Stage 5A originally called out:

- `/api/dashboard/cluster`
- `/api/namespaces`
- namespace summary (now projection-only in 5C)

Frontend surfaces showing dataplane state:

- cluster dashboard dataplane overview
- namespace list metadata
- namespace drawer summary status

## Namespace Summary Ownership (updated in 5C)

`/api/namespaces/{name}/summary` is **projection-led**: dataplane assembles counts, health, hotspots, and workload rollups from namespace-scoped snapshots only.

Still not snapshot-backed (honest gap until a Helm snapshot exists):

- Helm releases list and helm release count (return empty; use `/api/namespaces/{ns}/helmreleases` for direct reads)

The summary contract stays **partial / inexact** in metadata while Helm remains outside the dataplane.

## State Semantics In Stage 5A

Dataplane-backed surfaces currently use coarse states such as:

- `ok`: data loaded successfully for the current contract
- `empty`: the read succeeded but found no objects in the current contract
- `denied`: RBAC or auth prevented the required read
- `partial_proxy`: upstream proxy or connectivity behavior prevented trustworthy full observation
- `degraded`: transient, timeout, rate-limit, or other unstable upstream behavior reduced confidence
- `unknown`: no trustworthy coarse state could be derived

Supporting metadata semantics:

- freshness: how recent the snapshot or projection is
- coverage: how much of the intended contract the surface covers
- degradation: whether upstream instability affected observation quality
- completeness: whether the result is logically complete for the contract it claims

Important truthfulness rule:

- `coverage` and `completeness` describe the contract of the specific dataplane-backed surface, not the entire product.
- Example: namespace summary may be `partial` and `inexact` even when pods and deployments are correct, because the full summary remains intentionally mixed.

## Observer Lifecycle Visibility

Stage 5A intentionally keeps observer lifecycle bounded:

- no global "observe every cluster" loop
- no background warm-up for all contexts
- no configurable observer policy UI

Current visibility includes:

- observer state in `/api/dashboard/cluster`
- runtime log entries for observer transitions
- immediate observer refresh when a dataplane-backed endpoint first activates the plane, so lifecycle state is operator-visible without waiting for the first periodic tick

## Intentionally Accepted Partial Areas

These are partial by design and accepted for Stage 5A:

- most resource list/detail handlers still use direct `kube` reads
- only namespaces and nodes have long-lived observers
- pods and deployments are snapshot-backed on demand, not via long-lived observers
- there is no universal metadata envelope across every read endpoint yet
- plane scope is explicit in code but not yet user-configurable

*(Later stages migrated most namespaced lists; see Stage 5C read substrate doc.)*

## Deferred To Later Stages

The following work is intentionally deferred beyond 5C’s chosen scope:

- migrating **deferred** namespaced lists (serviceaccounts, roles, rolebindings, helm) and **node list** API to dataplane
- expanding long-lived observation to more resource kinds
- configurable profiles, discovery modes, and scope policies
- background warm-up or operator-configured observer lifecycle
- a uniform metadata envelope for all API responses

## Stage 5A Closure Judgment

Stage 5A should be considered closable when reviewed against the intended scope above:

- the dataplane boundary is real
- owned surfaces are real
- metadata is explicit
- observer behavior is bounded and visible
- active behavior is clearly separated from placeholder contracts
- remaining legacy ownership is documented honestly instead of hidden
