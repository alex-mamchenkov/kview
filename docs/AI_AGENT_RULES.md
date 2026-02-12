# AI_AGENT_RULES

These rules are meant for AI-assisted work on this repository (ChatGPT, Claude Code, etc.).

---

## Goals
- Build a local-first, Lens-like Kubernetes UI for personal use.
- Single-binary distribution (Go embeds UI).
- Prefer pragmatic UX improvements: reduce CLI memorization, speed up troubleshooting.

## Non-goals (for now)
- Multi-user auth, RBAC admin tooling, or cluster mutation tooling.
- Cloud-hosted deployment.
- Full Lens feature parity.

---

## Golden rule: follow the UI/UX contract
- `docs/UI_UX_GUIDE.md` is the **contract**.
- If code changes affect UX, update the guide **first**, then implement.
- If the guide and implementation disagree, fix one intentionally (no drift).

---

## Cross-linking rule (mandatory)
When implementing or refactoring a resource view:
- Always look for **cross-resource navigation opportunities**.
- If a meaningful link exists, implement it **immediately** (best-effort).
- Prefer bidirectional links when reasonable.
- Links must degrade gracefully under RBAC (target may show AccessDenied).

---

## Architectural rules
1) **Go backend owns cluster access**
   - Use `client-go` for Kubernetes API.
   - Respect kubeconfig exec plugins (OIDC, etc.).
   - Build clients with `clientcmd` loading rules so selected context is honored.
2) **UI is embedded**
   - UI build output is copied to `internal/server/ui_dist`.
   - `internal/server/ui_dist/index.html` placeholder must stay in git.
3) **Auth approach**
   - Token query param or Authorization header for `/api/*`.
   - UI routes public, API protected.
4) **State**
   - Persist UX state in localStorage: context, namespace, section, favourites-by-context.
   - Do not store secrets/tokens in localStorage.
5) **RBAC-friendly UX**
   - Never assume `default` namespace is accessible.
   - Forbidden must render as AccessDenied (not empty).
   - Prefer capability checks (SSAR “can-i”) where used in the project.

---

## UI consistency requirements (enforced)
- Use shared components/patterns from `docs/UI_UX_GUIDE.md`:
  - Section + KeyValueGrid (title above value)
  - Chips for labels/annotations/selectors
  - Status chips for enums
  - Conditions table as canonical pattern
  - CodeBlock for YAML/logs/manifests/values
- Avoid one-off rendering of common fields.
- If a pattern appears in 2+ drawers, extract a shared component.

---

## Dev rules / conventions
- Keep changes incremental and reviewable.
- Avoid heavy dependencies unless UX value is clear and approved.
- Keep all technical docs and code comments in **English**.
- Do not create git commits unless explicitly requested by the user.

---

## Mandatory verification for every change set
Before proposing docs updates or commit messages:
1) Run from repo root:
   ```
   make build
   ```
2) Fix all errors until it passes cleanly.

---

## Testing / safety
Anything that would mutate cluster state (even if added later) must:
- be behind an explicit UI action
- show a confirmation dialog
- surface errors clearly

---

## Session bootstrap (new chat)
When starting a new chat/context, the agent should:
1) Read `README.md`
2) Read `docs/HISTORY.md`
3) Read `docs/UI_UX_GUIDE.md`
4) Propose the next **small, high-value** step and how it fits the roadmap.
