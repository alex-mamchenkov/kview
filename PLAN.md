# UI Consistency Refactor + Cross-Links Sweep — Implementation Plan

## Summary

Create 4 shared components + 1 utility, then apply them across all 23 drawers to enforce the UI/UX contract. Fix bugs (PVC/PV conditions as plain text, Helm status as plain text). Add Helm release cross-links to resources parsed from manifest.

---

## Phase 1: Foundation (shared components + utils)

### 1A. Move `helmStatusChipColor` to `k8sUi.ts`
- Move from HelmReleaseDrawer (inline, lines 73-93) to `ui/src/utils/k8sUi.ts`
- Remove inline `ChipColor` type from HelmReleaseDrawer (already exported from k8sUi.ts)

### 1B. Create `MetadataSection.tsx` (`ui/src/components/shared/`)
Replaces the identical labels/annotations chips block duplicated in 12+ drawers.

```tsx
Props: {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}
```

Renders: `<Section title="Metadata">` with Labels sub-heading (chips or EmptyState) + Annotations sub-heading (chips or EmptyState). Adds `<Tooltip>` on chips for long values per contract §6.2.

### 1C. Create `ConditionsTable.tsx` (`ui/src/components/shared/`)
Replaces the conditions table duplicated in 10+ drawers. Fixes PVC/PV bug (plain text → chips).

```tsx
Props: {
  conditions: { type?; status?; reason?; message?; lastTransitionTime? }[];
  isHealthy?: (cond) => boolean;       // default: status === "True"
  chipColor?: (status) => ChipColor;   // default: conditionStatusColor()
  emptyMessage?: string;
  variant?: "accordion" | "section";   // default: "accordion"
  title?: string;                      // default: "Conditions & Health"
}
```

Renders: 5-column table (Type, Status chip, Reason, Message wrap, Last Transition). Unhealthy rows highlighted. Accordion variant auto-expands when unhealthy + shows "Unhealthy" chip badge.

### 1D. Create `EventsList.tsx` (`ui/src/components/shared/`)
Replaces the event card pattern duplicated in 19 drawers.

```tsx
Props: {
  events: { type; reason; message; count; firstSeen; lastSeen }[];
  emptyMessage?: string;
}
```

### 1E. Create `CodeBlock.tsx` (`ui/src/components/shared/`)
Unifies HelmReleaseDrawer's inline `MonospaceBlock` + `SyntaxHighlighter` usage across all drawers.

```tsx
Props: {
  code: string;
  language?: string;    // if set, uses SyntaxHighlighter; otherwise plain monospace
  showCopy?: boolean;   // default: true
}
```

### 1F. Create `helmManifest.ts` (`ui/src/utils/`)
Regex-based parser to extract resources from Helm manifest YAML string. No new npm dependencies.

```tsx
type ManifestResource = { kind; name; namespace?; apiVersion? };
function parseManifestResources(manifest: string): ManifestResource[];
```

Splits on `---`, extracts `kind:`, `apiVersion:`, `metadata.name:`, `metadata.namespace:` via regex.

---

## Phase 2: Fix Helm Status Chip (quick fix)

In `HelmReleaseDrawer.tsx`, change the status summary item from broken `chip: true` property to passing a `<Chip>` as the value (same pattern PVCDrawer uses for phase).

---

## Phase 3: Apply Shared Components Across Drawers

### 3A. MetadataSection adoption

**Replace inline metadata** in 9 drawers (direct swap):
ServiceDrawer, IngressDrawer, ConfigMapDrawer, SecretDrawer, PVCDrawer, PVDrawer, NamespaceDrawer, ServiceAccountDrawer, CRDDrawer

**Replace Accordion-wrapped metadata** in 2 drawers:
DeploymentDrawer (Spec tab), CronJobDrawer (Spec tab)

**Add metadata to drawers missing it** (data already available in types):
NodeDrawer (has `metadata.labels`/`annotations` but doesn't render them)

*Not adding to*: PodDrawer (summary type lacks labels/annotations — would require backend change), RBAC drawers (types lack labels/annotations), HelmReleaseDrawer (not a standard k8s object).

### 3B. ConditionsTable adoption

Replace inline conditions in 10 drawers:
- PodDrawer, DeploymentDrawer, ReplicaSetDrawer, StatefulSetDrawer, DaemonSetDrawer, JobDrawer → `variant="accordion"`, default `isHealthy`
- NodeDrawer → custom `isHealthy` (Ready=True is healthy, others False is healthy)
- NamespaceDrawer → custom inverted `isHealthy` (status=False is healthy)
- **PVCDrawer, PVDrawer** → **BUG FIX**: status was plain text, now gets chips + unhealthy highlighting
- CRDDrawer → inline color logic replaced by `conditionStatusColor()`

### 3C. EventsList adoption

Replace events rendering in all 19 drawers that have events tabs.

### 3D. CodeBlock adoption

- Replace `SyntaxHighlighter` in YAML tabs of ~20 drawers with `<CodeBlock language="yaml" code={...} />`
- Replace `MonospaceBlock` in HelmReleaseDrawer (Values, Manifest, Notes, YAML tabs)
- Remove inline `MonospaceBlock`/`CopyButton` from HelmReleaseDrawer

---

## Phase 4: Helm Cross-Links

### 4A. "Resources" section in HelmReleaseDrawer Overview

Parse the manifest using `parseManifestResources()`. Display as grouped `ResourceLinkChip` list in a `<Section title="Managed Resources">` on the Overview tab.

Supported kinds link to existing drawers: Deployment, StatefulSet, DaemonSet, Service, Ingress, ConfigMap, Secret, Job, CronJob, PVC, ServiceAccount, Role, RoleBinding, ClusterRole, ClusterRoleBinding, CustomResourceDefinition.

Unsupported kinds render as non-clickable chips.

### 4B. CRD detection from manifest

Resources with `kind: CustomResourceDefinition` are highlighted separately and link to the CRD drawer.

### 4C. Sub-drawer state management

Add state + drawer components for each supported kind (following existing PodDrawer pattern). Use a `openManifestResource(kind, name, namespace)` switch function.

---

## Phase 5: Build Verification

Run `make build` and fix all TypeScript/compile errors until clean.

---

## Estimated Impact

- **New files**: 5 (4 shared components + 1 utility)
- **Modified files**: ~24 (23 drawers + k8sUi.ts)
- **Net line reduction**: ~1200-1700 lines (duplicated code → shared components)
- **Bugs fixed**: 2 (PVC/PV conditions plain text, Helm status plain text)
- **New features**: Helm release → resource cross-links from manifest
