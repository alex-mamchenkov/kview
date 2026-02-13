# AI_AGENT_RULES

This document defines how AI code-generation agents (Claude, ChatGPT, etc.) must operate within this repository.

UI_UX_GUIDE.md is the authoritative UI contract.

---

## Core Principles

1. View-only unless explicitly instructed otherwise.
2. RBAC-aware behavior must always be respected.
3. Cross-resource linking is mandatory whenever logically possible.
4. Follow the “title above value” layout rule.
5. Use shared UI components — avoid ad-hoc styling.
6. No new dependencies unless explicitly approved.
7. Always run `make build` before suggesting documentation updates or commit messages.

---

## Cross-Link Contract

Whenever implementing or refactoring a feature:

- If resource A references resource B → add a deep link.
- If adding a new resource type → scan existing drawers for possible links.
- If reviewing code → verify link completeness.

Cross-linking is not optional.

---

## UI Consistency Enforcement

- Statuses must use chips.
- Selectors must render as key=value chips.
- Metadata must use consistent components.
- YAML must use canonical CodeBlock.
- Empty vs AccessDenied states must be correct.
- Gauges and progress indicators must follow defined threshold colors.

If inconsistency is detected → refactor immediately.

---

## Documentation Policy

- README contains architecture, philosophy, supported resources, and milestones.
- No HISTORY.md.
- No ROADMAP.md.
- Large architectural shifts require README update.

---

## Commit Flow

After implementation:

1. Run `make build`
2. Fix errors
3. Propose commit message
4. Propose doc updates if needed
5. Ask user before applying documentation changes

Never auto-commit.

