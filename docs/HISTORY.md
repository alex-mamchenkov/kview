# HISTORY

This file tracks notable changes and decisions to make future sessions easier.

## 2026-02-10 — Helm Releases (read-only)
### Backend
- Added Helm Releases endpoints:
  - `/api/namespaces/{ns}/helmreleases`
  - `/api/namespaces/{ns}/helmreleases/{name}`
- Discovers releases from Secrets (type `helm.sh/release.v1`, label `owner=helm`).
- Decodes base64+gzip+JSON payload without Helm SDK dependencies.
- List view decodes only the latest revision per release for performance.
- Details view returns all revisions as history.
- Decode errors are non-fatal: releases still appear with "unknown" status.

### UI
- Added Helm Releases table with columns for status, revision, chart, and updated.
- Added Helm Release drawer with tabs: Overview, History, and optional Notes.
- Status chips color-coded: deployed (green), failed (red), pending-* (warning).
- RBAC-aware empty state checks secrets list permission.
- Added "Helm" sidebar group.

## 2026-02-10 — Soft warnings (Phase 6 - Derived Insights)
### UI
- Added shared WarningsSection component for consistent advisory warning display.
- Ingress drawer: shows warnings when routing to Services with no ready endpoints or missing backends.
- Deployment drawer: warns when deployment has been unavailable for >10 minutes.
- Pod drawer: warns when pod is restarting frequently (>=5 restarts in 30 min or chronic container restarts).
- Warnings are client-side derived, non-blocking, and only appear when conditions are detected.

## 2026-02-05 — Initial MVP
### Backend
- Implemented Go server (chi) with token-based auth for `/api/*`.
- Implemented kube context manager using `client-go`:
  - list kubeconfig contexts
  - switch active context (process-level)
  - init clients with exec auth support (OIDC-friendly)
- Implemented API endpoints:
  - `/api/contexts` (list + active)
  - `/api/context/select`
  - `/api/namespaces` (with limited-mode if forbidden)
  - `/api/namespaces/{ns}/pods`
  - `/api/namespaces/{ns}/pods/{name}` (details + YAML + containers)
  - `/api/namespaces/{ns}/pods/{name}/events` (with fallback listing)
  - `/api/namespaces/{ns}/pods/{name}/logs/ws` (WS stream, follow, tail)

### UI
- React + Vite UI embedded into Go binary via `go:embed`.
- Sidebar:
  - context switch
  - namespace dropdown with search/autocomplete
  - favourites namespaces (sorted first)
  - state persisted in localStorage:
    - last context, namespace, section, favourites-by-context
- Pods table:
  - filter by name/node/phase
  - sorting
  - single select + Open button
  - double-click row opens Pod drawer
- Pod drawer:
  - offset below top AppBar
  - Summary view via chips (not text inputs)
  - Events list
  - YAML view with syntax highlight + line numbers
  - Logs view:
    - container dropdown
    - follow/stop (WS)
    - filter pattern
    - pretty JSON toggle (jq-lite)
    - line numbers + highlighting

### Notable issues solved
- `go:embed` required `internal/server/ui_dist` to exist at build time → committed placeholder `index.html`.
- kubeconfig `exec` auth plugin via `kubectl oidc-login` required correct PATH:
  - plugin available in one direnv environment but not another → recommended ensuring PATH includes plugin (often `$HOME/.krew/bin`).
- RBAC limitation: user can list namespaces but not access `default` → UI allows namespace selection and persists it.

## 2026-02-06 — Deployments + table/UX upgrades
### Backend
- Added Deployments endpoints:
  - `/api/namespaces/{ns}/deployments`
  - `/api/namespaces/{ns}/deployments/{name}`
  - `/api/namespaces/{ns}/deployments/{name}/events`
- Added latest-event summary support for list views (Pods + Deployments).
- Removed `managedFields` from YAML output to avoid noisy `f:`/`v:` fields.

### UI
- Added Deployments table + drawer (Summary/Events/YAML).
- Table upgrades (Pods + Deployments):
  - Age fix, refresh interval selector, last refresh timestamp.
  - Last Event column with color coding.
  - Quick filters based on name patterns:
    - `^(master|release|test|dev).*$ → $1`
    - `^([^\s-]+-[^\s-]+)-.+$ → $1`
  - Quick filters appear on a dedicated row; 3+ matches only; selected filter highlights and toggles.
- Drawer upgrades:
  - Events type color chips.
  - Logs: line limits, follow auto-scroll, pretty mode line numbering, wrap toggle, sticky controls.

## 2026-02-06 — Deployment detailed view (pod-aligned UX)
### Backend
- Expanded Deployment details DTO with:
  - conditions and rollout summary/diagnostics
  - ReplicaSets and rollout revision ordering
  - pod list for the Deployment selector
  - pod template spec summary (containers, scheduling, volumes, metadata)

### UI
- Deployment drawer rebuilt to mirror Pod UX:
  - tabs: Overview, Rollout, Pods, Spec, Events, YAML
  - overview summary + condition health highlighting
  - rollout summary + diagnostics section
  - ReplicaSets list with active/unhealthy highlights
  - pods list with click-through to Pod drawer
  - spec sections for template, scheduling, volumes, metadata

## 2026-02-06 — Pod detailed view expansion
### Backend
- Expanded Pod details DTO to cover:
  - conditions, lifecycle, container runtime state
  - env, mounts, probes, and resource requests/limits
  - volumes, security context, DNS, host aliases, topology spread

### UI
- Pod drawer rebuilt to match the standard detailed-view UX:
  - tabs: Overview, Containers, Resources, Events, YAML, Logs
  - overview summary + health conditions with highlighting
  - container accordions with runtime/resources/env/mounts/probes
  - resources sections for volumes, security context, DNS/aliases, topology spread
  - logs improvements: filter, pretty, line limits, wrap

## 2026-02-06 — DTO package refactor
### Backend
- Moved Pod and Deployment details DTO structs into `internal/kube/dto` package with no JSON contract changes.

## 2026-02-06 — Frontend helper deduplication
### UI
- Centralized formatting helpers (timestamp, age, value fallback) into shared utilities.
- Centralized Kubernetes UI mappings for phase/status/condition/event chip colors.

## 2026-02-06 — Drawer UI component extraction
### UI
- Extracted shared drawer primitives (section headers, key/value grids, empty/error states).
- Refactored Pod and Deployment drawers to reuse shared components with identical UX.

## 2026-02-06 — Frontend defensive hardening
### UI
- Hardened API error parsing for JSON, text, and HTML responses with consistent error shape.
- Added guards for missing/partial data and unknown enums in Pod/Deployment drawers.

## 2026-02-06 — Services list + details
### Backend
- Added Services endpoints:
  - `/api/namespaces/{ns}/services`
  - `/api/namespaces/{ns}/services/{name}`
  - `/api/namespaces/{ns}/services/{name}/events`
- Added Services list/detail DTOs (type, ports, selectors, traffic, endpoints summary).

### UI
- Added Services table with columns for type, cluster IPs, ports, endpoints summary, age.
- Added Service drawer with tabs: Overview, Endpoints, Events, YAML.
- Enabled navigation: Service → Pod drawer for endpoint targets.

## 2026-02-07 — Ingresses list + details
### Backend
- Added Ingresses endpoints:
  - `/api/namespaces/{ns}/ingresses`
  - `/api/namespaces/{ns}/ingresses/{name}`
  - `/api/namespaces/{ns}/ingresses/{name}/events`
- Added Ingresses list/detail DTOs (class, hosts, TLS, addresses, rules, default backend).
- Added derived warnings for missing backend services and zero-ready endpoints.
- Added ingress class resolution with annotation/default-class fallbacks.

### UI
- Added Ingresses table with columns for class, hosts, TLS, address, age.
- Added Ingress drawer with tabs: Overview, Rules, TLS, Events, YAML.
- Enabled navigation: Ingress → Service drawer (and onward to Pods).

## 2026-02-07 — ReplicaSets list + details
### Backend
- Added ReplicaSets endpoints:
  - `/api/namespaces/{ns}/replicasets`
  - `/api/namespaces/{ns}/replicasets/{name}`
  - `/api/namespaces/{ns}/replicasets/{name}/events`
- Added ReplicaSets list/detail DTOs (revision, replica counts, owner, selector, conditions, pod summary).

### UI
- Added ReplicaSets table with columns for revision, replica counts, owner, age.
- Added ReplicaSet drawer with tabs: Overview, Pods, Spec, Events, YAML.
- Enabled navigation: ReplicaSet → Pod drawer and ReplicaSet → Deployment drawer.

## 2026-02-07 — Deployment ↔ ReplicaSet deep-linking
### Backend
- Derived active ReplicaSet using Deployment revision when available (fallback to highest revision).

### UI
- Made Deployment Rollout ReplicaSets rows clickable to open ReplicaSet drawer.
- Preserved active/current labeling based on reliable revision signals only.

## 2026-02-07 — Jobs list + details
### Backend
- Added Jobs endpoints:
  - `/api/namespaces/{ns}/jobs`
  - `/api/namespaces/{ns}/jobs/{name}`
  - `/api/namespaces/{ns}/jobs/{name}/events`
- Added Jobs list/detail DTOs (status, duration, owner, conditions, pods summary).

### UI
- Added Jobs table with columns for status, active/succeeded/failed, duration, age.
- Added Job drawer with tabs: Overview, Pods, Events, YAML.
- Enabled navigation: Job → Pod drawer.

## 2026-02-07 — CronJobs list + details
### Backend
- Added CronJobs endpoints:
  - `/api/namespaces/{ns}/cronjobs`
  - `/api/namespaces/{ns}/cronjobs/{name}`
  - `/api/namespaces/{ns}/cronjobs/{name}/events`
- Added CronJobs list/detail DTOs (schedule, policy, active/recent jobs, template summary).
- Linked CronJob → Jobs using label selector (best-effort).

### UI
- Added CronJobs table with schedule, suspend, active, last schedule/success, age.
- Added CronJob drawer with tabs: Overview, Jobs, Spec, Events, YAML.
- Enabled navigation: CronJob → Job drawer (and onward to Pods).

## 2026-02-07 — Nodes list + details
### Backend
- Added Nodes endpoints:
  - `/api/nodes`
  - `/api/nodes/{name}`
- Added Node list/detail DTOs (roles, conditions, capacity vs allocatable, taints, pods summary).

### UI
- Added Nodes table with status, roles, allocatable capacity, pod count, age.
- Added Node drawer with tabs: Overview, Pods, Conditions, YAML.
- Enabled navigation: Node → Pod drawer.

## 2026-02-07 — RBAC-aware list views
### UI
- Added RBAC-aware list overlays that distinguish empty results from 401/403 errors.
- Introduced shared AccessDenied state with compact guidance for missing list permissions.
- Stabilized list query callbacks to avoid unintended re-fetch loops.

## 2026-02-09 — Namespaces list + details
### Backend
- Added Namespaces details endpoint:
  - `/api/namespaces/{name}`
- Expanded Namespaces list DTO with phase, age, and basic health flag (best-effort).
- Added Namespace detail DTO with metadata, conditions, and YAML.

### UI
- Added Namespaces table with phase, age, and unhealthy indicator.
- Added Namespace drawer with tabs: Overview, Conditions, YAML.
- Treated Namespaces as cluster-scoped for sidebar namespace selector.

## 2026-02-09 — StatefulSets list + details
### Backend
- Added StatefulSets endpoints:
  - `/api/namespaces/{ns}/statefulsets`
  - `/api/namespaces/{ns}/statefulsets/{name}`
  - `/api/namespaces/{ns}/statefulsets/{name}/events`
  - `/api/namespaces/{ns}/statefulsets/{name}/yaml`
- Added StatefulSet list/detail DTOs (replica summary, update strategy, selector, pods, spec summary).

### UI
- Added StatefulSets table with ready/service/age columns and RBAC-aware empty states.
- Added StatefulSet drawer with tabs: Overview, Pods, Spec, Events, YAML.
- Enabled navigation: StatefulSet → Pod drawer.

## 2026-02-09 — DaemonSets list + details
### Backend
- Added DaemonSets endpoints:
  - `/api/namespaces/{ns}/daemonsets`
  - `/api/namespaces/{ns}/daemonsets/{name}`
  - `/api/namespaces/{ns}/daemonsets/{name}/events`
  - `/api/namespaces/{ns}/daemonsets/{name}/yaml`
- Added DaemonSet list/detail DTOs (replica summary, update strategy, selector, pods, spec summary).
- Added selector-based pod listing helper for workload pods tabs.

### UI
- Added DaemonSets table with ready/updated/available columns and RBAC-aware empty states.
- Added DaemonSet drawer with tabs: Overview, Pods, Spec, Events, YAML.
- Enabled navigation: DaemonSet → Pod drawer.

## 2026-02-09 — ConfigMaps list + details (read-only)
### Backend
- Added ConfigMaps endpoints:
  - `/api/namespaces/{ns}/configmaps`
  - `/api/namespaces/{ns}/configmaps/{name}`
  - `/api/namespaces/{ns}/configmaps/{name}/events`
- Added ConfigMaps list/detail DTOs with key counts, immutable flag, and size summary.

### UI
- Added ConfigMaps table with columns for keys count, immutable, age.
- Added ConfigMap drawer with tabs: Overview, Keys, Events, YAML.

## 2026-02-09 — ConfigMap key previews (read-only)
### UI
- Rendered ConfigMap keys as accordions with safe value previews in the Keys tab.
- Added truncation and binary-data placeholders with YAML fallback guidance.

## 2026-02-09 — Secrets list + details (metadata-only)
### Backend
- Added Secrets endpoints:
  - `/api/namespaces/{ns}/secrets`
  - `/api/namespaces/{ns}/secrets/{name}`
  - `/api/namespaces/{ns}/secrets/{name}/events`
- Added Secrets list/detail DTOs with type, immutable flag, key counts, and metadata only (no values).

### UI
- Added Secrets table with columns for type, key count, immutable, age.
- Added Secret drawer with tabs: Overview, Keys, Events (no YAML).

## 2026-02-09 — PersistentVolumeClaims list + details
### Backend
- Added PersistentVolumeClaims endpoints:
  - `/api/namespaces/{ns}/persistentvolumeclaims`
  - `/api/namespaces/{ns}/persistentvolumeclaims/{name}`
  - `/api/namespaces/{ns}/persistentvolumeclaims/{name}/events`
  - `/api/namespaces/{ns}/persistentvolumeclaims/{name}/yaml`
- Added PVC list/detail DTOs (phase, storage class, access modes, sizes, bound PV, spec/status summaries).

### UI
- Added PersistentVolumeClaims table with status, storage class, size, volume, access modes, age.
- Added PVC drawer with tabs: Overview, Spec, Events, YAML.

## 2026-02-09 — PersistentVolumes list + details
### Backend
- Added PersistentVolumes endpoints:
  - `/api/persistentvolumes`
  - `/api/persistentvolumes/{name}`
  - `/api/persistentvolumes/{name}/events`
  - `/api/persistentvolumes/{name}/yaml`
- Added PV list/detail DTOs (phase, capacity, access modes, reclaim policy, storage class, claim ref, volume source summary).

### UI
- Added PersistentVolumes table with phase, capacity, storage class, reclaim policy, claim, age.
- Added PV drawer with tabs: Overview, Spec, Events, YAML.
- Added PV ↔ PVC cross-navigation with RBAC-aware link gating.
- Normalized access-denied API responses for list views when clusters return "not allowed".

## 2026-02-09 — Sidebar navigation polish
### UI
- Grouped sidebar navigation by workload, networking, configuration, storage, and cluster categories.
- Standardized human-readable resource labels in sidebar and list titles (no abbreviations).
- Removed ReplicaSets from primary sidebar navigation (still available via lists/deep-links).

## 2026-02-09 — RBAC resources visibility (read-only)
### Backend
- Added ServiceAccounts endpoints:
  - `/api/namespaces/{ns}/serviceaccounts`
  - `/api/namespaces/{ns}/serviceaccounts/{name}`
  - `/api/namespaces/{ns}/serviceaccounts/{name}/events`
  - `/api/namespaces/{ns}/serviceaccounts/{name}/yaml`
  - `/api/namespaces/{ns}/serviceaccounts/{name}/rolebindings` (best-effort)
- Added Roles endpoints:
  - `/api/namespaces/{ns}/roles`
  - `/api/namespaces/{ns}/roles/{name}`
  - `/api/namespaces/{ns}/roles/{name}/events`
  - `/api/namespaces/{ns}/roles/{name}/yaml`
- Added RoleBindings endpoints:
  - `/api/namespaces/{ns}/rolebindings`
  - `/api/namespaces/{ns}/rolebindings/{name}`
  - `/api/namespaces/{ns}/rolebindings/{name}/events`
  - `/api/namespaces/{ns}/rolebindings/{name}/yaml`
- Added ClusterRoles endpoints:
  - `/api/clusterroles`
  - `/api/clusterroles/{name}`
  - `/api/clusterroles/{name}/events`
  - `/api/clusterroles/{name}/yaml`
- Added ClusterRoleBindings endpoints:
  - `/api/clusterrolebindings`
  - `/api/clusterrolebindings/{name}`
  - `/api/clusterrolebindings/{name}/events`
  - `/api/clusterrolebindings/{name}/yaml`
- Added RBAC DTOs for list/details views, including rules/subjects/roleRef summaries.

### UI
- Added RBAC tables: Service Accounts, Roles, Role Bindings, Cluster Roles, Cluster Role Bindings.
- Added drawers with tabs:
  - ServiceAccount: Overview, Role Bindings, Events, YAML
  - Role/ClusterRole: Overview, Rules, Events, YAML
  - RoleBinding/ClusterRoleBinding: Overview, Subjects, Role Ref, Events, YAML
- Enabled RoleBinding → Role/ClusterRole cross-navigation.
- Preserved RBAC-aware list empty states for all new resources.

## 2026-02-09 — Refactoring pass (DTOs, access, navigation, UI dedupe)
### Backend
- Centralized list DTOs in `internal/kube/dto` for pods, deployments, namespaces, nodes, and events.
- Normalized access-denied handling across endpoints:
  - `/api/namespaces` now returns 403 when forbidden (no limited-mode payload).
  - Error payloads no longer expose raw Kubernetes error strings; responses are sanitized.

### UI
- Consolidated list filtering/quick filters/refresh toolbars into shared hooks and components.
- Unified Access Denied rendering and prevented raw error strings from leaking to the UI.
- Added consistent cross-navigation via shared link chips:
  - Pod → Node
  - Pod → controller (ReplicaSet, Deployment, StatefulSet, DaemonSet, Job)
  - Job → CronJob
  - ReplicaSet → Deployment
  - Ingress → Service
  - PV ↔ PVC
- Updated Node.js requirement to 20+ in docs.

## 2026-02-09 — Kubeconfig loading semantics
### Backend
- Made kubeconfig discovery explicit and deterministic:
  - `KUBECONFIG` supports single path or OS-specific path list.
  - Directory entries expand to sorted file lists (non-recursive).
  - Missing/invalid entries are skipped with warnings.
  - Later files override earlier ones; last non-empty `current-context` wins.

## 2026-02-09 — Context-aware namespace loading fix
### Backend
- Reverted to `clientcmd` loading rules for client creation to ensure
  selected context is used for all API calls.
- Added exec plugin env defaults (`KUBECONFIG`, `BROWSER`,
  `XDG_CACHE_HOME`, `KUBECACHEDIR`) to avoid `.envrc` reliance.

## Next planned items
- Live refresh toggle (pods polling).
- Quick actions:
  - delete pod
  - rollout restart / scale deployments
- Helm releases: ConfigMap storage driver support (best-effort).
- Exec terminal into container (xterm.js + SPDY/exec).
