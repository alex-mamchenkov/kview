# kview

kview is a local, single-binary, view-first Kubernetes UI inspired by tools like Lens and k9s.

It embeds a React + MUI frontend inside a Go backend and runs as a standalone binary.
The focus is operational clarity, consistency, and cross-resource navigation.

---

## Philosophy

- Local-first
- View-first (power-user ready)
- Strict RBAC awareness
- Deep cross-resource linking
- Clean, consistent UI contract

---

## Architecture

Backend:
- Go (chi, client-go)
- Embedded UI via go:embed

Frontend:
- React + Vite + MUI
- Drawer-based UX
- Shared components enforcing UI contract

---

## Supported Resources

Workloads:
- Pods
- Deployments
- ReplicaSets (derived via Deployments)
- StatefulSets
- DaemonSets
- Jobs
- CronJobs

Networking:
- Services
- Ingresses

Storage:
- PVCs
- PVs

Configuration:
- ConfigMaps
- Secrets

Cluster:
- Nodes
- Namespaces
- ResourceQuotas

Helm:
- Full Helm SDK integration
- Releases
- Values / Manifest / History / Notes

---

## Milestones

### ✅ Milestone 1 — Full UI Overview

Complete, RBAC-aware, cross-linked, view-only UI for:

- Core Kubernetes workloads
- Networking
- Storage
- RBAC
- CRDs
- Helm (SDK-backed)
- Namespace aggregated overview
- ResourceQuotas with gauges

Status: COMPLETE

---

### 🚧 Milestone 2 — Full Resource Control

Cluster mutation support:

- Install / upgrade / uninstall (Helm)
- Delete / restart / scale workloads
- Safe confirmations
- Clear error surfacing

Status: PLANNED

---

### 🚧 Milestone 3 — Web Terminal

- Exec into containers
- WebSocket streaming
- RBAC-aware
- Controlled lifecycle

Status: PLANNED

---

### 🚧 Milestone 4 — Port Forwarding

- UI-driven port forwarding
- Live session management
- Visual feedback

Status: PLANNED

---

### 🚧 Milestone 5 — Plugin / Extension System

- Custom views
- Custom resource renderers
- Configurable extensions

Status: FUTURE

---

## Development

Build:

    make build

Run:

    ./kview

---

## Design Contract

All UI changes must follow:

- docs/UI_UX_GUIDE.md
- docs/AI_AGENT_RULES.md

