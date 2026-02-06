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
- Services view:
  - sorting
  - filtering
  - single selection
  - refresh interval + last refresh timestamp
- Deployment details drawer:
  - overview summary + conditions
  - rollout summary + diagnostics
  - ReplicaSets table
  - pods list with click-through to Pod drawer
  - spec summary (template, scheduling, volumes, metadata)
  - events, YAML
- Service details drawer:
  - overview summary + ports + traffic notes
  - endpoints list with click-through to Pod drawer
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
- Node.js 18+ (or 20+ recommended)
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
