# kview

kview is a local, single-binary Kubernetes UI inspired by Lens.

The goal of the project is to replace frequent kubectl / helm usage for day-to-day
cluster inspection and troubleshooting, without memorizing command syntax.

The application runs a local HTTP server and serves a web UI from a single Go binary.

---

## Features

- Multiple kube contexts (clusters)
- Namespace selection with:
  - search
  - favourites
  - per-context persistence
- Nodes view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Namespaces view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Pods view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
  - last event summary
- Deployments view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
  - last event summary
- DaemonSets view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- StatefulSets view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- ReplicaSets view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Jobs view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- CronJobs view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Services view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Ingresses view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- ConfigMaps view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Secrets view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Service Accounts view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Roles view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Role Bindings view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Cluster Roles view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Cluster Role Bindings view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- PersistentVolumes view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- PersistentVolumeClaims view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Node details drawer:
  - overview summary + capacity/taints
  - pods list with click-through to Pod drawer
  - conditions, YAML
- Namespace details drawer:
  - overview summary + metadata
  - conditions, YAML
- Deployment details drawer:
  - overview summary + conditions
  - rollout summary + diagnostics
  - ReplicaSets table with click-through to ReplicaSet drawer
  - pods list with click-through to Pod drawer
  - spec summary (template, scheduling, volumes, metadata)
  - events, YAML
- StatefulSet details drawer:
  - overview summary + conditions
  - pods list with click-through to Pod drawer
  - spec summary (template, scheduling, volumes, metadata)
  - events, YAML
- DaemonSet details drawer:
  - overview summary + conditions
  - pods list with click-through to Pod drawer
  - spec summary (template, scheduling, volumes, metadata)
  - events, YAML
- ReplicaSet details drawer:
  - overview summary + conditions
  - pods list with click-through to Pod drawer
  - owner Deployment link
  - spec summary (template, scheduling, volumes, metadata)
  - events, YAML
- Job details drawer:
  - overview summary + conditions
  - pods list with click-through to Pod drawer
  - events, YAML
- CronJob details drawer:
  - overview summary + policy
  - jobs list with click-through to Job drawer
  - spec summary (template, scheduling, volumes, metadata)
  - events, YAML
- Service details drawer:
  - overview summary + ports + traffic notes
  - endpoints list with click-through to Pod drawer
  - events, YAML
- Ingress details drawer:
  - overview summary + warnings
  - rules grouped by host
  - TLS entries
  - events, YAML
- ConfigMap details drawer:
  - overview summary + metadata
  - keys list + size summary
  - events, YAML
- Secret details drawer:
  - overview summary + metadata
  - keys list (no values)
  - events
- ServiceAccount details drawer:
  - overview summary + metadata
  - RoleBindings list (best-effort)
  - events, YAML
- Role details drawer:
  - overview summary
  - rules table
  - events, YAML
- RoleBinding details drawer:
  - overview summary
  - subjects table
  - RoleRef details + navigation
  - events, YAML
- ClusterRole details drawer:
  - overview summary
  - rules table
  - events, YAML
- ClusterRoleBinding details drawer:
  - overview summary
  - subjects table
  - RoleRef details + navigation
  - events, YAML
- PersistentVolume details drawer:
  - overview summary + status
  - spec summary (access modes, volume mode, reclaim policy, volume source)
  - events, YAML
- PersistentVolumeClaim details drawer:
  - overview summary + status
  - spec summary (access modes, volume mode, requests)
  - events, YAML
- Pod details drawer:
  - overview summary + health conditions
  - containers: runtime, resources, env, mounts, probes
  - resources: volumes, image pull secrets, security context
  - scheduling: node selectors, tolerations, topology spread
  - events, YAML
  - logs with:
    - container selector
    - follow / stop (WebSocket)
    - text filter
    - line limits
    - pretty mode
    - wrap toggle
- RBAC-friendly behavior:
  - does not assume access to `default` namespace
  - handles Forbidden responses gracefully
- Local-first, no cloud, no telemetry

---

## Requirements

Backend:
- Go 1.22 or newer

Frontend:
- Node.js 20+ (required by Vite toolchain)
- npm

Kubernetes access:
- Working kubeconfig
- Supports `exec` auth plugins (OIDC), including:
  - `kubectl oidc-login`
- `kubectl` must be executable in the same environment where kview is run

---

## Quick start (development)

If your kubeconfig is split across multiple files:

export KUBECONFIG="$HOME/.kube/cluster1.yaml:$HOME/.kube/cluster2.yaml"

Run kview:

make run

The server will print a local URL similar to:

http://127.0.0.1:10443/?token=XXXXXXXX

Open that URL in your browser.

---

## Build a single binary

make build
./kview

The resulting binary embeds the UI and does not require Node.js to run.

---

## Make targets

- make ui
  installs UI dependencies, builds UI, copies output into internal/server/ui_dist

- make run
  builds UI and runs Go server

- make build
  builds UI and kview binary

- make clean
  removes UI build artifacts and embedded UI output

---

## Authentication notes (OIDC / exec plugins)

kview uses client-go and respects kubeconfig users[].user.exec.

If your kubeconfig contains:

command: kubectl
args:
  - oidc-login
  - get-token

Then kubectl and the plugin must be available in PATH.

Common pitfall:
- plugin works in one directory via direnv
- but fails when running kview elsewhere

Solution:
- ensure plugin path (often $HOME/.krew/bin) is in PATH
- or run kview from the same environment

---

## Repository structure

cmd/kview/                main entrypoint
internal/cluster/         kubeconfig and context management
internal/kube/            Kubernetes API helpers
internal/stream/          WebSocket streaming (logs)
internal/server/          HTTP server, routing, embedded UI
ui/                        React + Vite frontend
docs/                      project documentation

---

## Project status

This is an actively evolving personal tool.
APIs and UX may change quickly.

See docs/HISTORY.md for a detailed changelog.
See docs/AI_AGENT_RULES.md for AI and contribution rules.
