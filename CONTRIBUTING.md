# Contributing

This repository is currently developed primarily by a single maintainer.

Contributions are welcome, but the workflow is intentionally lightweight.

---

## Development workflow

1. Open an issue (optional but recommended for larger changes)
2. Make small, focused commits
3. Prefer clarity over cleverness
4. Verify context switching with multiple kubeconfigs (no `.envrc` dependency)

---

## Prerequisites

- Go 1.22+
- Node.js 20+ (required by Vite toolchain)
- npm

---

## Code style

- Go:
  - follow standard `gofmt`
  - avoid premature abstractions
- UI:
  - React + MUI
  - keep components readable and local
  - avoid over-engineering state management

---

## Safety rules

Any feature that mutates cluster state (delete pod, restart workload, etc.)
must:

- be explicit (no hidden side effects)
- require a clear user action
- include a confirmation step
- surface errors clearly

---

## AI-assisted development

AI assistance is expected and encouraged.

Rules for AI-generated changes:
- Prefer full-file replacements for non-trivial edits
- Avoid partial diffs that are hard to apply
- Keep documentation up to date

See `docs/AI_AGENT_RULES.md` for details.

