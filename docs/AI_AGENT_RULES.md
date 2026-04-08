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

# Quality Checks

AI agents must run verification through the pinned Docker toolchain, not the host Go/Node/npm toolchain. Use host-local commands only when the project owner explicitly asks for them or when documenting why Docker is unavailable.

Default full check sequence:

```bash
make docker-image
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e GOCACHE=/workspace/.cache/go-build -e GOMODCACHE=/workspace/.cache/go-mod -e npm_config_cache=/workspace/.cache/npm -v "$PWD:/workspace" -w /workspace kview-build:go1.25.0-node22.20.0 make check
```

For build verification:

```bash
make build-docker
```

Tests should accompany important logic changes.
