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

## Next planned items
- Live refresh toggle (pods polling).
- Quick actions:
  - delete pod
  - rollout restart / scale deployments
- Additional resources views:
  - Deployments, Jobs, Services, Ingress
- Helm releases view (via Helm SDK or shell integration).
- Exec terminal into container (xterm.js + SPDY/exec).
