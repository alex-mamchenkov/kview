# kview Activity Panel Architecture

## Goal

Create a unified operational activity system used by:

-   terminal sessions
-   port‑forward sessions
-   background workers
-   runtime logs

The Activity Panel displays long‑lived operational processes.

### Current State (Milestone 3)

- **Activities tab**: lists all activities from `ActivityRegistry`, including the runtime/system activity and per-session activities.
- **Sessions tab**: surfaces `session type = terminal` backed by `SessionManager`, with lifecycle states (`pending`, `starting`, `running`, `stopping`, `stopped`, `failed`) and a per-session details row.
- **Logs tab**: shows runtime logs emitted via the runtime log buffer, including launcher/runtime messages and session lifecycle events (e.g. terminal session create/stop).

Planned but not yet implemented:

- `session type = portforward` and port-forward activities
- worker/analytics activities beyond the runtime/system activity
