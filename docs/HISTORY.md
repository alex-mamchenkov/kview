# HISTORY

This file tracks notable changes and decisions to make future sessions easier.

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

## Next planned items
- Live refresh toggle (pods polling).
- Quick actions:
  - delete pod
  - rollout restart / scale deployments
- Additional resources views:
  - Deployments, Jobs, Services, Ingress
- Helm releases view (via Helm SDK or shell integration).
- Exec terminal into container (xterm.js + SPDY/exec).
