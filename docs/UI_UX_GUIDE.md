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

All resource drawers must follow the signals‑first content contract defined in
**Signals‑first Drawer Content** below (canonical tab order, Overview section
order, and the `AttentionSummary` component).

---

# Signals‑first Drawer Content

Drawers are opened because a row drew the operator's attention.
Every drawer must answer questions in this order:

1. What's wrong (signals / attention reasons / unhealthy conditions / recent Warning events)
2. What is it doing now (key operational state)
3. What is it related to (pods, endpoints, subjects, keys, …)
4. What is it defined as (spec, metadata)
5. Raw (events, logs, YAML)

## Tab ordering

All resource drawers follow the same tab order:

Overview → <kind‑specific relation tabs> → Spec? → Events → Logs? → Metadata → YAML

Metadata and YAML are always the two trailing tabs, in that order.
Events precedes them. Logs, where applicable, sits between Events and Metadata.

Logs is owned by the resource that streams logs (today: Pod). Workload drawers
that do not stream their own logs must not add a Logs tab; they navigate to a
Pod drawer via their Pods relation tab, and the Pod drawer is where Logs lives.

## Overview tab content order

Inside the Overview tab, sections must appear in this fixed order. Any section
with nothing to show is hidden (no empty placeholders).

1. Actions                        (Section, divider={false})
2. AttentionSummary               (health chip + attention reasons + jump chips)
3. Signals                        (per‑resource signals, severity‑sorted)
4. Conditions (unhealthy first)   (ConditionsTable with unhealthyFirst)
5. Key state                      (replicas / endpoint readiness / usage gauges)
6. Recent Warning events          (last 3, link to Events tab)
7. Compact summary KV             (name / namespace / age / phase only)

The full metadata grid (labels, annotations, full key/value summary, spec
detail) lives in the Metadata / Spec tabs, never in Overview.

## AttentionSummary component

All drawers use the shared `AttentionSummary` component for the top‑of‑overview
state callout. It consolidates what were previously four separate patterns
(health chip, loose attention‑reason chips, `WarningsSection`, ad‑hoc signal
boxes).

`AttentionSummary` renders nothing when a resource has no attention‑worthy
state. Drawers must not reimplement this block inline.

## Signal sources

Signals are produced by the **backend** dataplane signal engine. The UI must
not compute, threshold, or aggregate warnings. If a warning needs to exist, it
is added to the dataplane signal engine first and then exposed through one of
the sources below.

In priority order:

1. Dedicated signals endpoint (namespaces today; per‑resource over time)
2. DTO fields populated by the backend: `needsAttention`, `healthBucket`,
   `attentionReasons`, structured warnings (e.g. `IngressWarningsDTO`)
3. Conditions with unhealthy status (display‑only sorting, not invented data)
4. Warning‑type events (display‑only filter, not invented data)

All sources funnel into `AttentionSummary` + the Signals section; no drawer
invents its own layout for signal display, and no drawer invents its own
warnings.

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
