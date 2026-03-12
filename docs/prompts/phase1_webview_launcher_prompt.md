# kview Phase 1C — Webview and Launcher Modes Prompt

## Objective

Implement launcher modes for `kview` so the application can run as:

- browser mode
- webview mode
- server-only mode

The goal is to preserve the current architecture:

- Go backend
- local HTTP / WebSocket server
- React frontend

while replacing the hardcoded "always open system browser" behavior with a small launcher abstraction.

This phase must introduce a **desktop webview shell** without rewriting the application into a desktop-first architecture.

---

## Mandatory Reading

Before implementing anything, read:

- `docs/AI_COLLABORATION.md`
- `docs/AI_AGENT_RULES.md`
- `docs/UI_UX_GUIDE.md`
- `docs/architecture/kview_runtime_architecture.md`
- `docs/architecture/kview_go_package_structure.md`
- `docs/prompts/phase1_master_prompt.md`

Also inspect current startup flow in the repository, especially:
- `cmd/kview/main.go`
- current browser-opening logic
- current HTTP server startup path

---

## Scope

This phase implements only launcher and startup behavior.

It must include:

- launcher mode abstraction
- browser launcher
- webview launcher
- server-only mode
- minimal startup refactor if needed

It must NOT include:

- terminal implementation
- port-forward implementation
- analytics workers
- activity panel feature work
- broad backend refactor
- rewriting frontend routing
- replacing HTTP/WebSocket architecture

---

## Required Modes

### Browser Mode

Behavior:
- start backend normally
- open system browser to the local application URL

This should remain the default mode unless repository conventions suggest otherwise.

Suggested CLI:

```text
--mode browser
```

---

### Webview Mode

Behavior:
- start backend normally
- open a desktop webview window pointing to the same local application URL
- do not open the external system browser

Suggested CLI:

```text
--mode webview
```

Requirements:
- window title should be `kview`
- use reasonable default size
- keep implementation minimal
- webview is only a shell around the existing local app

Important:
- the UI must still be served through the existing local HTTP server
- do not embed or rewrite the frontend app architecture
- do not create a second UI entry path

---

### Server-Only Mode

Behavior:
- start backend normally
- do not open browser
- do not open webview

Suggested CLI:

```text
--mode server
```

This mode is useful for testing and future non-desktop evolution.

---

## Implementation Guidance

## Launcher Abstraction

Introduce a small launcher package or equivalent structure.

Suggested responsibilities:

- parse launch mode
- decide whether to open browser, webview, or nothing
- keep startup logic explicit and testable

Example target structure:

```text
internal/launcher/
  mode.go
  browser.go
  webview.go
```

If the repository uses a different but clean structure, adapt carefully.

---

## Startup Flow

Recommended flow:

1. parse config / flags
2. start backend HTTP server
3. determine local application URL
4. dispatch launcher by mode
5. block until shutdown as the app currently does

Do not invert ownership in a way that forces the UI to own the backend.

---

## Webview Requirements

The webview implementation must be intentionally minimal.

Requirements:

- loads the same URL as browser mode
- no feature-specific app logic inside launcher
- no terminal/session logic in launcher layer
- no frontend duplication

Nice-to-have but optional:
- graceful fallback error message if webview dependency is unavailable on platform
- clean separation between platform-specific code and generic launcher flow

---

## Dependency Guidance

Keep dependency footprint conservative.

If a new dependency is required for webview support:

- choose a minimal, maintained option
- keep usage isolated to launcher/webview code
- avoid spreading dependency-specific types across the application

Do not introduce desktop-specific frameworks that force future web deployment compromises.

---

## CLI / Config Expectations

Support an explicit mode selector.

Preferred:

```text
kview --mode browser
kview --mode webview
kview --mode server
```

If the current app already has config/env conventions, integrate cleanly rather than inventing a conflicting pattern.

Default should remain stable and unsurprising.

---

## Logging / UX Expectations

Startup logs should make the selected mode clear.

Examples of acceptable log messages:

- starting in browser mode
- starting in webview mode
- starting in server-only mode

The user should be able to understand what happened without reading code.

---

## Constraints

- keep current browser mode working
- do not break existing startup flow
- do not change Activity Panel behavior
- do not change theme system behavior
- do not change API routes except what is strictly needed for startup
- prefer incremental change over large refactor

---

## Validation

After implementation, verify:

### Browser mode
- backend starts
- system browser opens
- app loads normally

### Webview mode
- backend starts
- embedded window opens
- app loads normally inside webview
- no external browser opens automatically

### Server-only mode
- backend starts
- no browser or webview opens
- app remains reachable at local URL

Also verify:
- existing UI works unchanged
- WebSocket functionality still works
- current routing still works

Run build and validation commands according to repository conventions.

---

## Deliverables

1. launcher mode implementation
2. webview shell implementation
3. minimal startup refactor if needed
4. brief implementation summary
5. list of added dependencies, if any
6. notes about platform-specific limitations if discovered

---

## Acceptance Criteria

This phase is complete when:

- `browser` mode works
- `webview` mode works
- `server` mode works
- hardcoded browser-open behavior is removed
- backend HTTP architecture remains intact
- frontend continues using the same local URL path
- code is clean enough for future desktop and web deployment paths

---

## Important Reminder

The webview is a **launcher shell**, not a new architecture.

Do not turn `kview` into a desktop-only app.

The same backend + web UI model must remain valid for future cluster/web deployment.\n