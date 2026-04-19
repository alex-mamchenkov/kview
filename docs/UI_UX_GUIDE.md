# UI / UX Guide

This document defines the **UI architecture contract** for kview.

The UI must remain:

- consistent
- predictable
- reusable
- operator‑friendly

---

# Navigation Model

kview uses **drawer-based navigation**.

Pattern:

List → Row → Drawer

The list remains visible while the drawer displays resource details.

---

# Resource List Pattern

All resource lists follow the same layout:

Toolbar  
DataGrid  
Footer  
Drawer

Lists must support:

- sorting
- filtering
- selection
- refresh

---

# Drawer Pattern

Drawers are the primary inspection surface.

Typical structure:

Header  
Tabs  
Content Sections

Drawers should stay compact and information‑dense.

---

# UI Tokens

UI tokens define:

- spacing
- drawer width
- typography
- colors
- table density

Tokens must be reused instead of inline styles whenever possible.

---

# Component Reuse

Common patterns must be extracted into reusable components.

Examples:

- resource table patterns
- action buttons
- mutation dialogs
- drawer shells

Avoid copy‑paste implementations.

---

# Capability‑Aware UI

Actions must respect RBAC capabilities.

The UI queries:

POST /api/capabilities

Actions must:

- hide if unavailable
- disable if forbidden
- show denial reason when needed

---

# User Settings

kview exposes a full-page Settings view from the header, next to the theme selector.

Settings are browser-local and separate from navigation state. The profile currently owns:

- dashboard refresh defaults
- initial Activity Panel state
- smart-filter enablement and scoped smart-filter rules
- custom container command presets
- custom workload action presets
- namespace enrichment and dataplane policy controls
- JSON import/export for the settings profile only

Settings import/export must not include active context, active namespace, favourite namespaces, recent namespace history, or theme.

Custom container commands must appear only on matching Pod containers. Safe commands require simple confirmation; dangerous commands require typed confirmation before execution. Command output should render according to the configured output type: free text, key-value, CSV/delimited table, code-highlighted text, or downloadable file.

Custom workload actions must appear only on matching patch-capable workload resources. Safe actions require simple confirmation; dangerous actions require typed confirmation before execution. The first action pack is workload-scoped and supports set/unset env, set image, and raw JSON/merge patch presets for Deployments, StatefulSets, DaemonSets, and ReplicaSets.

NS Enrichment settings must keep focused enrichment as the default: current, recent, and favourite namespaces, idle-gated and capped. Background namespace sweep is opt-in and should use warning copy because large contexts can create many Kubernetes reads over time. Backend dataplane tuning must be documented in DATAPLANE.md when behavior changes.

---

# Cross‑Resource Navigation

Navigation between related resources should be first‑class.

Examples:

Pod → Node  
Service → Pods  
Deployment → ReplicaSets

These links open new drawers.

---

# Error Handling

Errors must be:

- visible
- structured
- consistent

Prefer mutation dialogs and activity logs for error reporting.

---

# Consistency Rules

Maintain consistent:

- typography
- spacing
- drawer layouts
- action placement
- table density

---

# Gauge & Progress Components

All gauge and progress visualizations must use the shared components below. Do not
implement inline bar or progress elements.

## GaugeBar — single-value percentage bar

Use for: resource quota utilization, HPA replica counts, metric targets, CPU/memory
percentages — any single value expressed as 0-100%.

```tsx
import GaugeBar, { type GaugeTone } from "../shared/GaugeBar";

<GaugeBar value={72} tone="warning" label="72%" />
```

Props:

- `value` — number 0-100 (auto-clamped)
- `tone` — `"success" | "warning" | "error" | "info" | "primary" | "default"`
- `label` — optional React node centered over the bar
- `height` — override px height (defaults to `GAUGE_HEIGHT` token)

Tone thresholds (recommended convention): success < 80%, warning 80–89%, error ≥ 90%.

## GaugeTableRow — canonical gauge panel row

Use for every gauge panel in the application. All four gauge-bearing panels
(cluster dashboard dataplane, namespace health overview, namespace capacity quotas,
HPA scaling and metric targets) use this component exclusively.

```tsx
import GaugeTableRow from "../shared/GaugeTableRow";
import { Table, TableBody } from "@mui/material";

<Table size="small">
  <TableBody>
    <GaugeTableRow
      label="Current replicas"
      bar={<GaugeBar value={72} tone="warning" />}
      summary="72 current / 100 max"
    />
  </TableBody>
</Table>
```

Props: `label` (bold, 12 px, left), `bar` (GaugeBar or StackedMetricBar), `summary`
(12 px, secondary color, right-aligned), optional `hint` (tooltip icon after label).

Column widths are fixed inside the component (25 % label / auto bar / 26 % summary).
Do not override column widths per-callsite.

Rules:
- No text or percent labels rendered inside the bar itself.
- No chips inside the summary cell — text only.
- Label font is never monospace.
- Do not use table headers above GaugeTableRow tables; the enclosing Section title
  provides sufficient context.

## StackedMetricBar — multi-segment proportional bar

Use for: health distribution across states (running/pending/failed), hit/miss ratios,
traffic mix — any value that is a sum of categorized counts.

```tsx
import StackedMetricBar from "../shared/StackedMetricBar";

<StackedMetricBar segments={[
  { label: "Healthy",     value: 8, color: "#2e7d32" },
  { label: "Progressing", value: 1, color: "#ed6c02" },
  { label: "Degraded",    value: 1, color: "#d32f2f" },
]} />
```

Props: `segments: Array<{ label: string; value: number; color: string }>`.  
Segments with `value <= 0` are skipped. Each segment shows a tooltip with label and value.

## Tokens

Defined in `src/theme/sxTokens.ts`:

- `GAUGE_HEIGHT = 20` — standard bar height in px for both GaugeBar and StackedMetricBar
- `GAUGE_BORDER_RADIUS = 2` — slightly rounded squared corners (8 px); do not override per-callsite
- `GAUGE_TRACK_BG` — background color for the empty gauge track; used by both components

## Segment colors

Always use the named constants — never hardcode hex values:

| Token | Hex | Use |
|---|---|---|
| `GAUGE_COLOR_HEALTHY` | `#2e7d32` | Healthy, running, cache hit, nominal |
| `GAUGE_COLOR_WARNING` | `#ed6c02` | Progressing, pending, cache miss |
| `GAUGE_COLOR_ERROR` | `#d32f2f` | Failed, degraded, error |
| `GAUGE_COLOR_NEUTRAL` | `#607d8b` | Completed / succeeded (terminal-ok) |
| `GAUGE_COLOR_UNKNOWN` | `#8e24aa` | Unknown state |

---

# Related documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — product architecture and read/mutation boundaries
- [DATAPLANE.md](DATAPLANE.md) — snapshot metadata and dataplane behavior (for list honesty chips and dashboard copy)
- [API_READ_OWNERSHIP.md](API_READ_OWNERSHIP.md) — which routes are snapshot-backed vs direct read
