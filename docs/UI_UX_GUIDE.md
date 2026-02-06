# UI/UX Guide (Current Contract)

This document describes the current UI/UX behavior as implemented. It is a contract for refactors and new resource views. Update this guide first, then align code to it.

## 1. High-level principles

- Local-first, fast, operator-oriented UI; no onboarding flow.
- Drawer-based navigation model for details; lists stay visible.
- Keyboard- and scan-friendly layout with compact density and minimal chrome.
- Preference for explicit data over visual noise; small chips and tables over charts.

## 2. Global layout conventions

- **Main layout**: full-height app with a fixed top bar, permanent left sidebar, and central content area.
- **Right-side drawer**: primary detail surface for a selected resource.
- **Drawer usage**:
  - Open via double-click on a list row or via an explicit “Open” action in the list toolbar.
  - Close via drawer close icon or outside click.
  - Drawer is anchored to the right, sized for dense information, and sits below the top app bar.
- **List ↔ drawer relationship**: list remains visible and stable; drawer is an overlay for details without navigating away.

## 3. Tabs model

- **Why tabs**: high-density data is grouped into stable, scan-friendly categories.
- **Naming**: short, resource-oriented nouns (e.g., Overview, Pods, Spec).
- **Typical tab roles**:
  - Overview
  - Containers / Rollout / Pods (resource-specific)
  - Resources / Spec
  - Events
  - YAML
  - Logs
- **Rules**:
  - Keep tab count small and consistent per resource.
  - YAML and Events are always present in detail drawers.
  - Logs appear only when relevant (currently only in Pod drawer).

## 4. Overview tab conventions

- **Purpose**: fast, always-visible summary of health, identity, and key scheduling/runtime fields.
- **Always-visible summary**: a top summary block rendered as a dense key/value grid.
- **Health / Conditions section**:
  - Always present.
  - Auto-expands when any condition is unhealthy.
  - Unhealthy rows are highlighted with a light background and “Unhealthy” chip.
- **Auto-expand rules**:
  - Conditions: expand when any condition is unhealthy.
  - Rollout summary/diagnostics (Deployment): expand when rollout is in progress or has warnings/errors.
  - Lifecycle/Scheduling (Pod): expand when any of its fields are populated.
- **Date/time format**: `YYYY-MM-DD HH:MM:SS` (global format).

## 5. Sections & accordions

- **Section headers**: bold title with divider; optional right-aligned actions.
- **When to use accordions**:
  - Groups with variable or large datasets (containers, scheduling, rollout diagnostics).
  - Subsystems that can be collapsed when healthy or empty.
- **Default state**:
  - Summary sections and primary data are expanded by default.
  - Secondary sections may be collapsed unless there is actionable data.
- **Auto-expansion for problematic data**:
  - Unhealthy conditions expand automatically.
  - Rollout diagnostics expand if warnings, missing replicas, or in-progress state.
  - Container accordions auto-expand for unhealthy containers; otherwise the first container expands.

## 6. Tables & lists

- **Common patterns**:
  - Pods and Deployments lists use a compact DataGrid with fixed columns and a toolbar.
  - Detail sections use compact tables for structured fields (conditions, env, volumes, probes).
  - Events are rendered as compact cards with chips and timestamp.
- **Column density**:
  - Compact density by default.
  - Column widths favor scanability over full text visibility.
- **Alignment and truncation**:
  - Long values wrap in detail views; list views keep columns tight.
  - Use chips for status fields to reduce visual noise.
- **Sorting and filtering**:
  - Default sort by name ascending for list views.
  - Toolbar provides text filter and “quick filter” chips derived from naming patterns.
  - Refresh interval selector is always present in list views.

## 7. Status & color semantics

- **Healthy / unhealthy**:
  - Healthy states use `success` chips.
  - Unhealthy states use `error` chips and light background highlights.
- **Warning / error**:
  - Warnings use `warning` chips (e.g., rollout in progress or waiting).
  - Errors use `error` chips (e.g., failed conditions).
- **Unknown / pending**:
  - Unknown or pending states default to `warning` or `default` depending on the enum.
- **Rule**: color communicates status, not decoration.
- **Fallback**: unknown enum values render with `default` chip color and `"-"` for missing data.

## 8. Formatting rules

- **Date/time**: global format is `YYYY-MM-DD HH:MM:SS`.
- **Age**:
  - Table age: `Xd Yh`, `Xh Ym`, or `Xm` (compact).
  - Detail age: `Xs`, `Xm`, `Xh`, or `Xd` (single unit).
- **Missing values**: always render as `"-"`.
- **Key/value chips**:
  - Use compact chips for `key=value` lists (labels, annotations, selectors).
  - Provide a hover hint with the full `key=value` string to reveal long values.
- **Monospace usage**:
  - Use monospace for code-like or identifier-heavy values when displayed in key/value grids.
  - YAML and Logs are always monospace with line numbers.

## 9. Error & empty states

- **Errors**:
  - Rendered as plain error text inside the content surface.
  - The UI never hides the rest of the layout on error.
- **Empty data**:
  - Explicit empty-state messages (e.g., “No events found…”).
  - Empty sections remain visible with a clear message.
- **Principle**: the UI must not break on partial data; unknown/missing values are rendered safely.

## 10. Reusability & scalability rules

- **Shared components first**:
  - Use existing patterns: key/value grid, section header, empty/error states.
- **Avoid copy-paste**:
  - Extract new shared patterns when two views need the same structure.
- **New resources**:
  - Start from Pods/Deployments list + drawer pattern.
  - Follow the existing tab model and overview conventions.
- **Pods as reference implementation**:
  - The Pod drawer is the canonical example for details, logging, and condition handling.

## 11. Non-goals

- Not a metrics dashboard.
- Not a YAML editor.
- Not a visual timeline tool.
