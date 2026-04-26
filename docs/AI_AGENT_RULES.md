# AI Agent Development Rules

This document defines **strict rules for AI agents working on the kview repository**.

---

# Reuse Over Duplication

Always search for existing components before implementing new ones.

Prefer extending existing logic instead of duplicating code.

---

# Extract Reusable Components

If similar logic appears multiple times:

1. extract shared logic
2. create reusable helpers
3. refactor callers

---

# Use UI Tokens

Avoid introducing inline styles.

Use shared tokens and layout helpers.

---

# Follow UI Architecture

All UI code must follow:

docs/UI_UX_GUIDE.md

Do not invent new UI patterns without updating documentation.

---

# Maintain Consistent UX

Preserve:

- table density
- drawer layout
- action placement
- terminology

---

# Preserve Type Safety

Avoid introducing:

any  
as any

Prefer explicit interfaces.

---

# Respect Backend Mutation Architecture

All mutations must use:

POST /api/actions

and be registered via ActionRegistry.

---

# Respect RBAC Awareness

UI actions must respect:

POST /api/capabilities

Never bypass capability checks.

---

# Avoid Dead Code

Remove unused helpers and components.

Do not introduce experimental code without purpose.

---

# Documentation Updates

If architecture changes, update:

- README
- docs/ARCHITECTURE.md
- docs/DATAPLANE.md (read-side behavior)
- docs/API_READ_OWNERSHIP.md (if GET / read routes change)
- docs/UI_UX_GUIDE.md

---

# Git Discipline

AI coding agents must never create commits, amend commits, tag releases, push branches, or otherwise mutate Git repository history/remotes unless the project owner specifically requests and confirms that exact action.

When the user asks for a commit message suggestion, provide a conventional commit message with:

- a concise title using the `type(scope): summary` shape when a scope is useful
- a meaningful body that explains what changed and why
- verification notes when relevant

Do not run `git commit`, `git push`, `git tag`, or release commands just because you suggested a message.

---

# Mandatory Pre-Read

Before making code changes, AI coding agents must read:

- README.md
- docs/AI_AGENT_RULES.md
- docs/AI_BOOTSTRAP_PROMPT.md
- docs/DEV_CHECKLIST.md
- docs/ARCHITECTURE.md
- docs/DATAPLANE.md
- docs/API_READ_OWNERSHIP.md
- docs/UI_UX_GUIDE.md

Use the focused architecture/read/UI docs according to the area being changed, but treat this list as the baseline context when starting from README.md.

---

# Quality Checks

AI agents must run verification through Makefile targets that use the pinned Docker toolchain by default. Do not call host `go`, `npm`, `node`, or `local-*` Makefile targets unless the project owner explicitly asks for a host-toolchain exception or Docker is unavailable and the exception is documented.

Default full check sequence:

```bash
make check
```

For build verification:

```bash
make build
```

For release-style artifacts:

```bash
make build-release GOOS=linux GOARCH=amd64 OUTPUT=dist/kview-linux-amd64
```

Tests should accompany important logic changes.
