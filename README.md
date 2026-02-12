# kview

kview is a **local, single-binary** Kubernetes UI inspired by Lens (and the “fast feedback” vibe of k9s), built for **day-to-day inspection and troubleshooting** without memorizing kubectl/helm commands.

- **Local-first**: runs on your machine, serves a local web UI, embeds the UI in the Go binary.
- **View-only**: no cluster mutations from the UI.
- **Operator-oriented**: dense information, quick scanning, deep links between related resources.
- **RBAC-aware**: handles partial permissions gracefully and avoids “false empty” lists.

---

## What you get

### Core UX model
- Permanent left navigation + main list view
- Right-side **drawer** for details (the list stays visible)
- Tabs inside drawers: **Overview + resource-specific + Events + YAML** (Logs where applicable)

### Global behaviors
- Text filter + quick filters
- Refresh interval selector + “last refresh” timestamp
- Stable selection + “Open” action + double-click to open drawer
- RBAC-aware empty states (smart “can-i” checks where available)
- Global “backend unreachable / recovered” banner (no spam)

---

## Supported resources

### 🧩 Workloads (namespaced)
- Pods (includes Logs)
- Deployments (includes rollout diagnostics + ReplicaSets deep-linking)
- Stateful Sets
- Daemon Sets
- Jobs
- Cron Jobs

### 🌐 Networking (namespaced)
- Services
- Ingresses

### ⚙️ Configuration (namespaced)
- Config Maps
- Secrets

### 💾 Storage
- Persistent Volume Claims (namespaced)
- Persistent Volumes (cluster-scoped)

### 🧠 Cluster
- Nodes (cluster-scoped)
- Namespaces (cluster-scoped)

### 🔐 RBAC / Access Control
- Service Accounts (namespaced)
- Roles (namespaced)
- Role Bindings (namespaced)
- Cluster Roles (cluster-scoped)
- Cluster Role Bindings (cluster-scoped)

### 🧩 Extensions / Operators
- Custom Resource Definitions (CRDs) (cluster-scoped)

### 📦 Helm
- Helm Releases (namespaced)
- Helm Charts (cluster-level aggregated view)

---

## Details drawers (high-level)
Most resources follow a consistent drawer pattern:
- **Overview**: identity + status + key operational fields
- **Resource-specific**: Pods / Rollout / Rules / Spec / Subjects / Rules (varies per resource)
- **Events**: compact event list with severity cues
- **YAML**: raw YAML view (monospace, copy-friendly)

Pods additionally support **Logs** (WebSocket follow, filters, wrap/pretty toggles).

---

## Requirements
Backend:
- Go 1.25+

Frontend (development only):
- Node.js 20+
- npm

Kubernetes access:
- Working kubeconfig
- Supports `exec` auth plugins (e.g., `kubectl oidc-login`)
- `kubectl` must be available in PATH for exec plugins

---

## Quick start (development)

If your kubeconfig is split across multiple files:

```bash
export KUBECONFIG="$HOME/.kube/cluster1.yaml:$HOME/.kube/cluster2.yaml"
```

Run:

```bash
make run
```

The server prints a local URL like:

```text
http://127.0.0.1:10443/?token=XXXXXXXX
```

Open it in your browser.

---

## Build a single binary

```bash
make build
./kview
```

The binary embeds the UI and does not require Node.js to run.

---

## Make targets

- `make ui`  
  Install UI deps, build UI, copy output into `internal/server/ui_dist`

- `make run`  
  Build UI and run Go server

- `make build`  
  Build UI and build the `kview` binary

- `make clean`  
  Remove UI build artifacts and embedded UI output

---

## Authentication notes (OIDC / exec plugins)
kview uses `client-go` and respects kubeconfig `users[].user.exec`.

If your kubeconfig contains something like:

```yaml
command: kubectl
args:
  - oidc-login
  - get-token
```

Then `kubectl` and the plugin must be available in PATH.

Common pitfall:
- the plugin works in one directory via `direnv`
- but fails when running kview elsewhere

Fix:
- ensure the plugin path (often `$HOME/.krew/bin`) is in PATH
- or run kview from the same environment

kview also provides helpful defaults (`KUBECONFIG`, `BROWSER`, `XDG_CACHE_HOME`, `KUBECACHEDIR`) to exec plugins when missing.

---

## Repository structure

```text
cmd/kview/                main entrypoint
internal/cluster/         kubeconfig and context management
internal/kube/            Kubernetes API helpers and handlers
internal/stream/          WebSocket streaming (logs)
internal/server/          HTTP server, routing, embedded UI
ui/                       React + Vite frontend
docs/                     project documentation
```

---

## Documentation
- `docs/ROADMAP.md` — planned phases and upcoming work
- `docs/HISTORY.md` — changelog-style progress log
- `docs/UI_UX_GUIDE.md` — UI/UX contract (must stay consistent with implementation)
- `docs/AI_AGENT_RULES.md` — rules for AI-assisted development
