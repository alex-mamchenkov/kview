# kview ROADMAP

This document defines the **high-level development roadmap** for kview.
It is intentionally **view-only focused** and prioritizes **understanding over control**.

The roadmap is structured in phases.  
Each phase builds on the previous one and should be completed **incrementally**, without blocking future progress on perfection.

Refactors and cleanups are allowed between phases if they support scalability and consistency.

Recent UX polish (2026-02-09):
- Grouped sidebar navigation by resource category.
- Standardized human-readable resource labels in navigation and list titles.

---

## Guiding principles

- **View-only first**: kview is a read-only UI focused on understanding clusters and releases.
- **Fast insight**: optimize for “what is happening?” and “why?” over configuration editing.
- **Consistency**: new resources must follow the existing UI/UX guide.
- **Incremental delivery**: avoid large rewrites; prefer small, complete steps.

---

## Phase 0 — Foundation (DONE)

Core UI architecture and reference implementations.

- [x] Global app layout (lists + right-side drawer)
- [x] Stable tab-based drawer model
- [x] Pods list and detailed view
  - Overview, Containers, Resources, Events, YAML, Logs
- [x] Deployments list and detailed view
  - Overview, Rollout, Pods, Spec, Events, YAML
- [x] Logs viewer (static + streaming)
- [x] Events viewer with severity highlighting
- [x] Consistent date/time formatting (`YYYY-MM-DD HH:MM:SS`)
- [x] Shared UI utilities and components
- [x] Frontend safety hardening (optional fields, fallbacks)
- [x] UI/UX Guide (`docs/UI_UX_GUIDE.md`)

Outcome:
A stable, scalable UI foundation with Pods as the canonical reference.

---

## Phase 1 — Traffic & Entry Points

Understand **how traffic reaches workloads**.

- [x] Services
  - Overview (type, selector, ports)
  - Endpoints (ready / not ready Pods)
  - Linked Pods navigation
  - Events, YAML

- [x] Ingresses
  - Hosts and paths
  - Backend Services
  - TLS configuration
  - IngressClass
  - Warnings for missing endpoints or backends
  - Navigation: Ingress → Service → Pods

Outcome:
Clear visibility into how external and internal traffic flows through the cluster.

---

## Phase 2 — Release Mechanics

Understand **how releases are rolled out and what changed**.

- [x] ReplicaSets
  - Revision and age
  - Desired / current / ready replicas
  - Linked Pods health
  - Relationship to Deployments
  - Pod template summary (read-only)

- [x] Deployment deep-linking
  - Deployment → ReplicaSets → Pods
  - Clear identification of active vs old ReplicaSets

Outcome:
First-class rollout understanding without inspecting YAML manually.

---

## Workloads coverage (namespaced)

- [x] Pods
- [x] Deployments
- [x] DaemonSets
- [x] ReplicaSets
- [x] StatefulSets
- [x] Jobs
- [x] CronJobs

Note: some phase checkboxes may be stale compared to `docs/HISTORY.md`; reconcile in a follow-up pass.

---

## Phase 3 — Batch & Background Workloads

Understand **non-service workloads**.

- [x] Jobs
  - Status (active / succeeded / failed)
  - Duration and start time
  - Linked Pods
  - Events and logs (read-only)

- [x] CronJobs
  - Schedule and concurrency policy
  - Last run status
  - Active Jobs
  - Failure visibility

Outcome:
Visibility into background and scheduled workloads that often affect production indirectly.

---

## Phase 4 — Cluster Context

Understand **where workloads run and under what constraints**.

- [ ] Nodes
  - Conditions
  - Capacity vs allocatable
  - Taints
  - Pods count per node

- [x] Namespaces
  - Resource counts per namespace
  - High-level health summary
  - Namespace-scoped filtering context

Outcome:
Operational context beyond individual workloads.

---

## Phase 5 — Configuration Awareness (Read-only)

Understand **what configuration affects workloads**, without exposing secrets.

- [x] ConfigMaps
  - Keys list and size
  - Key value previews (safe, truncated)
  - Last update time
  - Reverse references (used by which Pods/Deployments)

- [x] Secrets (metadata only)
  - Type
  - Keys count
  - Reverse references
  - No secret values displayed

Outcome:
Faster diagnosis of config-related issues without compromising security.

---

## Phase 5.5 — Storage (Read-only)

Understand **how storage is provisioned and bound**.

- [x] PersistentVolumes (PVs)
  - Capacity, access modes, reclaim policy, storage class, phase
  - Bound PVC link (read-only)
  - Events, YAML
- [x] PersistentVolumeClaims (PVCs)
  - Status (Pending/Bound/Lost) and access modes
  - Requested vs capacity size
  - Bound PV name (read-only)
  - Events, YAML

Outcome:
Storage visibility without exposing mutation paths.

---

## Phase 6 — Derived Insights (Optional / Later)

Provide **helpful conclusions**, not raw data.

- [ ] Cross-resource navigation
  - Pod → Service → Ingress
  - Deployment → ReplicaSets → Pods

- [ ] Soft warnings (client-side only)
  - Ingress pointing to Service with no endpoints
  - Deployment unavailable for extended time
  - Pods restarting frequently

- [ ] Health summaries
  - Namespace-level health rollups
  - Deployment rollout state summaries

Outcome:
kview starts assisting reasoning, not just displaying objects.

---

## Explicit non-goals (for now)

- Editing or mutating cluster state
- Applying YAML or scaling resources
- Metrics dashboards or time-series graphs
- GitOps or CI/CD workflows
- Helm install/upgrade operations

These are intentionally out of scope to keep kview focused.

---

## How to use this roadmap

- Each phase can be implemented independently.
- Before starting a new resource:
  - Define its **view-only value**
  - Align UI with `docs/UI_UX_GUIDE.md`
  - Create a focused Cursor prompt for that resource
- Refactors are allowed between phases if they reduce duplication or improve scalability.

This roadmap may evolve, but changes should be intentional and documented here first.
