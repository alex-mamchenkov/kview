# AI_AGENT_RULES

These rules are meant for future ChatGPT sessions working on this repository.

## Goals
- Build a local-first, Lens-like Kubernetes UI for personal use.
- Single-binary distribution (Go embeds UI).
- Prefer pragmatic UX improvements: reduce CLI memorization, speed up troubleshooting.

## Non-goals (for now)
- Multi-user auth, RBAC admin tooling.
- Cloud-hosted deployment.
- Full Lens feature parity.

## Architectural rules
1. **Go backend owns cluster access**
   - Use `client-go` for Kubernetes API.
   - Respect kubeconfig exec plugins (OIDC via `kubectl oidc-login`).
2. **UI is embedded**
   - UI build output is copied to `internal/server/ui_dist`.
   - `internal/server/ui_dist/index.html` placeholder must stay in git.
3. **Auth approach**
   - Token query param or Authorization header for `/api/*`.
   - UI routes should be public, API protected.
4. **State**
   - Persist user UX state in localStorage:
     - active context, namespace, section, favourites-by-context.
   - Avoid storing secrets/tokens in localStorage.
5. **RBAC-friendly UX**
   - Never assume `default` namespace is accessible.
   - Handle Forbidden errors gracefully.
   - Prefer capability checks (later: SelfSubjectAccessReview) for actions.

## Dev rules / conventions
- Keep code readable and incremental.
- Prefer providing full file contents when making large edits.
- Avoid adding heavy dependencies unless the UX value is clear.
- Keep all technical docs (README, comments) in English unless explicitly requested otherwise.
  - (User-facing conversation may be Russian; code/docs are English.)

## Testing / safety
- Anything that mutates cluster state (delete pod, rollback) should:
  - be behind an explicit button
  - show a confirmation dialog
  - surface errors clearly

## Session bootstrap
When starting a new session, the agent should:
1. Read `README.md`
2. Read `docs/HISTORY.md`
3. Identify current roadmap and propose next small, high-value step.

