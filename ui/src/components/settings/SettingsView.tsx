import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { Theme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  applyDataplaneProfile,
  customActionResourceKeys,
  defaultDataplaneSettings,
  dataplaneNamespaceWarmResourceKeys,
  dataplaneTTLResourceKeys,
  exportUserSettingsJSON,
  newCustomActionDefinition,
  newCustomCommandDefinition,
  newSmartFilterRule,
  parseUserSettingsJSON,
  sanitizeRegexFlags,
  smartFilterResourceKeysForScope,
  dataplaneSettingsForContext,
  type CustomActionDefinition,
  type CustomActionKind,
  type CustomActionPatchType,
  type CustomActionTarget,
  type CustomCommandDefinition,
  type CustomCommandOutputType,
  type CustomCommandSafety,
  type DataplaneProfile,
  type DataplaneContextOverrideSettings,
  type DataplaneSettings,
  type KviewUserSettingsV2,
  type SettingsResourceScopeMode,
  type SettingsScopeMode,
  type SignalOverride,
  type SmartFilterRule,
} from "../../settings";
import { useUserSettings } from "../../settingsContext";
import { getResourceLabel, type ListResourceKey } from "../../utils/k8sResources";
import { formatChipLabel } from "../../utils/k8sUi";
import { actionRowSx, panelBoxSx } from "../../theme/sxTokens";
import InfoHint from "../shared/InfoHint";
import ScopedCountChip from "../shared/ScopedCountChip";
import { apiGetWithContext } from "../../api";
import type { ApiDataplaneSignalCatalogResponse, DataplaneSignalCatalogItem } from "../../types/api";

type SettingsSection = "appearance" | "smartFilters" | "commands" | "actions" | "dataplane" | "importExport";
type DataplaneTab = "overview" | "enrichment" | "metrics" | "signals" | "cache";

type Props = {
  token: string;
  contexts: Array<{ name: string }>;
  namespaces: string[];
  activeContext: string;
  activeNamespace: string;
  onClose: () => void;
};

function dataplaneWarmResourceLabel(kind: string): string {
  if (kind === "helmreleases") return "Helm Releases";
  return getResourceLabel(kind as ListResourceKey);
}

function dataplaneProfileLabel(profile: DataplaneProfile): string {
  switch (profile) {
    case "manual":
      return "Manual";
    case "balanced":
      return "Balanced";
    case "wide":
      return "Wide";
    case "diagnostic":
      return "Diagnostic";
    case "focused":
    default:
      return "Focused";
  }
}

function dataplaneProfileEnrichmentText(profile: DataplaneProfile): string {
  switch (profile) {
    case "manual":
      return "Manual mode disables automatic namespace enrichment and background sweep; live reads still populate snapshots when you open lists.";
    case "balanced":
      return "Balanced enrichment warms more namespace targets and key resource lists while keeping background work modest.";
    case "wide":
      return "Wide enrichment warms all namespaced dataplane list kinds and enables a measured idle sweep across more namespaces.";
    case "diagnostic":
      return "Diagnostic enrichment is the most aggressive profile for troubleshooting broad cluster state and stale signal coverage.";
    case "focused":
    default:
      return "Focused enrichment keeps high-value data warm for the active namespace, recent namespaces, and favourites.";
  }
}

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "smartFilters", label: "Smart Filters" },
  { id: "commands", label: "Custom Commands" },
  { id: "actions", label: "Custom Actions" },
  { id: "dataplane", label: "Dataplane" },
  { id: "importExport", label: "Import / Export" },
];

const headerRowSx = { display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" };

const settingsShellSx = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  overflow: "hidden",
  backgroundColor: "var(--bg-primary)",
};

const settingsMainSurfaceSx = {
  flex: 1,
  minWidth: 0,
  overflow: "auto",
  p: 1.25,
  backgroundColor: "background.paper",
  backgroundImage: (theme: Theme) =>
    theme.palette.mode === "dark" ? "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))" : "none",
  "& .MuiPaper-root": {
    backgroundColor: "background.paper",
    backgroundImage: (theme: Theme) =>
      theme.palette.mode === "dark" ? "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))" : "none",
  },
};

const overrideMetaRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  minHeight: 22,
};

const overrideControlBlockSx = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: 56,
};

function ReorderButtons({
  label,
  index,
  lastIndex,
  onUp,
  onDown,
  onRemove,
}: {
  label: string;
  index: number;
  lastIndex: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 0.25 }}>
      <Tooltip title={`Move ${label} up`}>
        <span>
          <IconButton size="small" onClick={onUp} disabled={index === 0} aria-label={`Move ${label} up`}>
            <ArrowUpwardIcon fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`Move ${label} down`}>
        <span>
          <IconButton size="small" onClick={onDown} disabled={index === lastIndex} aria-label={`Move ${label} down`}>
            <ArrowDownwardIcon fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`Remove ${label}`}>
        <IconButton size="small" color="error" onClick={onRemove} aria-label={`Remove ${label}`}>
          <DeleteOutlineIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function updateAppearance(
  settings: KviewUserSettingsV2,
  patch: Partial<KviewUserSettingsV2["appearance"]>,
): KviewUserSettingsV2 {
  return {
    ...settings,
    appearance: { ...settings.appearance, ...patch },
  };
}

function updateSmartFilters(
  settings: KviewUserSettingsV2,
  patch: Partial<KviewUserSettingsV2["smartFilters"]>,
): KviewUserSettingsV2 {
  return {
    ...settings,
    smartFilters: { ...settings.smartFilters, ...patch },
  };
}

function updateCustomCommands(
  settings: KviewUserSettingsV2,
  patch: Partial<KviewUserSettingsV2["customCommands"]>,
): KviewUserSettingsV2 {
  return {
    ...settings,
    customCommands: { ...settings.customCommands, ...patch },
  };
}

function updateCustomActions(
  settings: KviewUserSettingsV2,
  patch: Partial<KviewUserSettingsV2["customActions"]>,
): KviewUserSettingsV2 {
  return {
    ...settings,
    customActions: { ...settings.customActions, ...patch },
  };
}

function updateDataplane(settings: KviewUserSettingsV2, patch: Partial<DataplaneSettings>): KviewUserSettingsV2 {
  return {
    ...settings,
    dataplane: { ...settings.dataplane, global: { ...settings.dataplane.global, ...patch } },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch as T) ?? base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const prev = out[key];
    if (isPlainObject(prev) && isPlainObject(value)) out[key] = deepMerge(prev, value);
    else out[key] = value;
  }
  return out as T;
}

function stripUndefinedDeep<T>(value: T): T | undefined {
  if (Array.isArray(value)) return value as T;
  if (!isPlainObject(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    const normalized = stripUndefinedDeep(child);
    if (normalized === undefined) continue;
    if (isPlainObject(normalized) && Object.keys(normalized).length === 0) continue;
    next[key] = normalized;
  }
  return Object.keys(next).length > 0 ? (next as T) : undefined;
}

function rulePatternError(rule: SmartFilterRule): string | null {
  if (!rule.pattern.trim()) return "Pattern is required.";
  try {
    new RegExp(rule.pattern, rule.flags);
    return null;
  } catch (err) {
    return (err as Error).message || "Invalid regex.";
  }
}

function commandPatternError(command: CustomCommandDefinition): string | null {
  if (!command.containerPattern.trim()) return null;
  try {
    new RegExp(command.containerPattern);
    return null;
  } catch (err) {
    return (err as Error).message || "Invalid regex.";
  }
}

function actionPatternError(action: CustomActionDefinition): string | null {
  if (!action.containerPattern.trim()) return null;
  try {
    new RegExp(action.containerPattern);
    return null;
  } catch (err) {
    return (err as Error).message || "Invalid regex.";
  }
}

function actionPatchError(action: CustomActionDefinition): string | null {
  if (action.action !== "patch") return null;
  if (!action.patchBody.trim()) return "Patch body is required.";
  try {
    JSON.parse(action.patchBody);
    return null;
  } catch (err) {
    return (err as Error).message || "Invalid JSON patch body.";
  }
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = items.slice();
  const current = next[index];
  next[index] = next[nextIndex];
  next[nextIndex] = current;
  return next;
}

function smartFilterResourceHelperText(scope: SettingsScopeMode): string {
  switch (scope) {
    case "cluster":
      return "Cluster-scoped resources only.";
    case "namespace":
      return "Namespace-scoped resources only.";
    case "all":
    default:
      return "All list resources.";
  }
}

export default function SettingsView({ token, contexts, namespaces, activeContext, activeNamespace, onClose }: Props) {
  const { settings, setSettings, replaceSettings, resetSettings } = useUserSettings();
  const [section, setSection] = useState<SettingsSection>("appearance");
  const [dataplaneTab, setDataplaneTab] = useState<DataplaneTab>("overview");
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [signalCatalog, setSignalCatalog] = useState<DataplaneSignalCatalogItem[]>([]);
  const [signalCatalogError, setSignalCatalogError] = useState<string | null>(null);
  const [dataplaneEditScope, setDataplaneEditScope] = useState<"global" | "context">("global");
  const [signalCatalogQuery, setSignalCatalogQuery] = useState("");

  const contextOptions = useMemo(
    () => Array.from(new Set([activeContext, ...contexts.map((c) => c.name)].filter(Boolean))),
    [activeContext, contexts],
  );
  const namespaceOptions = useMemo(
    () => Array.from(new Set([activeNamespace, ...namespaces].filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [activeNamespace, namespaces],
  );

  useEffect(() => {
    if (section !== "dataplane" || dataplaneTab !== "signals") return;
    let cancelled = false;
    apiGetWithContext<ApiDataplaneSignalCatalogResponse>("/api/dataplane/signals/catalog", token, activeContext)
      .then((res) => {
        if (cancelled) return;
        setSignalCatalog(res.items || []);
        setSignalCatalogError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSignalCatalogError((err as Error).message || "Failed to load signal catalog.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeContext, dataplaneTab, section, settings.dataplane.global.signals.overrides, settings.dataplane.contextOverrides, token]);

  const setRule = (index: number, patch: Partial<SmartFilterRule>) => {
    setSettings((prev) => {
      const rules = prev.smartFilters.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule));
      return updateSmartFilters(prev, { rules });
    });
  };

  const setCommand = (index: number, patch: Partial<CustomCommandDefinition>) => {
    setSettings((prev) => {
      const commands = prev.customCommands.commands.map((command, i) =>
        i === index ? { ...command, ...patch } : command,
      );
      return updateCustomCommands(prev, { commands });
    });
  };

  const setAction = (index: number, patch: Partial<CustomActionDefinition>) => {
    setSettings((prev) => {
      const actions = prev.customActions.actions.map((action, i) =>
        i === index ? { ...action, ...patch } : action,
      );
      return updateCustomActions(prev, { actions });
    });
  };

  const updateContextDataplaneOverride = (
    prev: KviewUserSettingsV2,
    updater: (current: DataplaneContextOverrideSettings) => DataplaneContextOverrideSettings,
  ): KviewUserSettingsV2 => {
    const contextName = activeContext.trim();
    if (!contextName) return prev;
    const contextOverrides = { ...prev.dataplane.contextOverrides };
    const current = contextOverrides[contextName] || {};
    const next = stripUndefinedDeep(updater(current));
    if (next) contextOverrides[contextName] = next;
    else delete contextOverrides[contextName];
    return { ...prev, dataplane: { ...prev.dataplane, contextOverrides } };
  };

  const patchDataplaneSection = <K extends keyof DataplaneSettings>(
    key: K,
    patch: Partial<DataplaneSettings[K]>,
  ) => {
    setSettings((prev) => {
      if (dataplaneEditScope === "global") {
        return updateDataplane(prev, {
          [key]: deepMerge(prev.dataplane.global[key], patch),
        } as Partial<DataplaneSettings>);
      }
      return updateContextDataplaneOverride(prev, (current) => ({
        ...current,
        [key]: deepMerge((current[key] || {}) as DataplaneSettings[K], patch),
      }));
    });
  };

  const setDataplanePrimitive = <K extends keyof DataplaneSettings>(key: K, value: DataplaneSettings[K]) => {
    setSettings((prev) => {
      if (dataplaneEditScope === "global") return updateDataplane(prev, { [key]: value } as Partial<DataplaneSettings>);
      return updateContextDataplaneOverride(prev, (current) => ({ ...current, [key]: value }));
    });
  };

  const setNamespaceEnrichment = (patch: Partial<DataplaneSettings["namespaceEnrichment"]>) => {
    patchDataplaneSection("namespaceEnrichment", patch);
  };

  const setNamespaceSweep = (patch: Partial<DataplaneSettings["namespaceEnrichment"]["sweep"]>) => {
    patchDataplaneSection("namespaceEnrichment", {
      sweep: patch as DataplaneSettings["namespaceEnrichment"]["sweep"],
    });
  };

  const setDataplaneSnapshots = (patch: Partial<DataplaneSettings["snapshots"]>) => {
    patchDataplaneSection("snapshots", patch);
  };

  const setDataplanePersistence = (patch: Partial<DataplaneSettings["persistence"]>) => {
    patchDataplaneSection("persistence", patch);
  };

  const setDataplaneObservers = (patch: Partial<DataplaneSettings["observers"]>) => {
    patchDataplaneSection("observers", patch);
  };

  const setDataplaneBudget = (patch: Partial<DataplaneSettings["backgroundBudget"]>) => {
    patchDataplaneSection("backgroundBudget", patch);
  };

  const setDataplaneDashboard = (patch: Partial<DataplaneSettings["dashboard"]>) => {
    patchDataplaneSection("dashboard", patch);
  };
  const setDataplaneMetrics = (patch: Partial<DataplaneSettings["metrics"]>) => {
    patchDataplaneSection("metrics", patch);
  };

  const setContextMetricsEnabled = (enabled: boolean) => {
    setDataplaneMetrics({ enabled });
  };

  const resetContextMetricsOverride = () => {
    setSettings((prev) => {
      if (dataplaneEditScope !== "context") return prev;
      return updateContextDataplaneOverride(prev, (current) => ({ ...current, metrics: undefined }));
    });
  };
  const setDataplaneSignals = (patch: Partial<DataplaneSettings["signals"]>) => {
    setSettings((prev) => {
      const sanitizeSignals = (next: DataplaneSettings["signals"]) => {
        if (next.quotaCriticalPercent <= next.quotaWarnPercent) {
          const defaults = defaultDataplaneSettings().signals;
          next.quotaWarnPercent = defaults.quotaWarnPercent;
          next.quotaCriticalPercent = defaults.quotaCriticalPercent;
        }
        return next;
      };
      if (dataplaneEditScope === "global") {
        return updateDataplane(prev, {
          signals: sanitizeSignals(deepMerge(prev.dataplane.global.signals, patch)),
        });
      }
      return updateContextDataplaneOverride(prev, (current) => ({
        ...current,
        signals: sanitizeSignals(
          deepMerge(
            (current.signals || { overrides: {} }) as DataplaneSettings["signals"],
            patch,
          ),
        ),
      }));
    });
  };

  const setSignalOverride = (signalType: string, scope: "global" | "context", patch: Partial<SignalOverride>) => {
    if (!signalType) return;
    setSettings((prev) => {
      const signals = prev.dataplane.global.signals;
      const cleanOverride = (override: SignalOverride): SignalOverride | null => {
        const next: SignalOverride = { ...override, ...patch };
        if (next.enabled === undefined) delete next.enabled;
        if (next.severity === undefined) delete next.severity;
        if (next.priority === undefined) delete next.priority;
        return Object.keys(next).length > 0 ? next : null;
      };
      if (scope === "global") {
        const overrides = { ...signals.overrides };
        const next = cleanOverride(overrides[signalType] || {});
        if (next) overrides[signalType] = next;
        else delete overrides[signalType];
        return updateDataplane(prev, { signals: { ...signals, overrides } });
      }
      const contextName = activeContext.trim();
      if (!contextName) return prev;
      const contextOverrides = { ...prev.dataplane.contextOverrides };
      const current = { ...(contextOverrides[contextName]?.signals?.overrides || {}) };
      const next = cleanOverride(current[signalType] || {});
      if (next) current[signalType] = next;
      else delete current[signalType];
      const existing = contextOverrides[contextName] || {};
      const nextOverride: DataplaneContextOverrideSettings = {
        ...existing,
        signals: Object.keys(current).length > 0
          ? { ...(existing.signals || {}), overrides: current }
          : undefined,
      };
      const cleaned = stripUndefinedDeep(nextOverride);
      if (cleaned) contextOverrides[contextName] = cleaned;
      else delete contextOverrides[contextName];
      return { ...prev, dataplane: { ...prev.dataplane, contextOverrides } };
    });
  };

  const resetSignalOverride = (signalType: string, scope: "global" | "context") => {
    setSettings((prev) => {
      const signals = prev.dataplane.global.signals;
      if (scope === "global") {
        const overrides = { ...signals.overrides };
        delete overrides[signalType];
        return updateDataplane(prev, { signals: { ...signals, overrides } });
      }
      const contextName = activeContext.trim();
      if (!contextName) return prev;
      const contextOverrides = { ...prev.dataplane.contextOverrides };
      const current = { ...(contextOverrides[contextName]?.signals?.overrides || {}) };
      delete current[signalType];
      const existing = contextOverrides[contextName] || {};
      const nextOverride: DataplaneContextOverrideSettings = {
        ...existing,
        signals: Object.keys(current).length > 0
          ? { ...(existing.signals || {}), overrides: current }
          : undefined,
      };
      const cleaned = stripUndefinedDeep(nextOverride);
      if (cleaned) contextOverrides[contextName] = cleaned;
      else delete contextOverrides[contextName];
      return { ...prev, dataplane: { ...prev.dataplane, contextOverrides } };
    });
  };

  const resetSignalOverrides = (scope: "global" | "context") => {
    setSettings((prev) => {
      const signals = prev.dataplane.global.signals;
      if (scope === "global") {
        return updateDataplane(prev, { signals: { ...signals, overrides: {} } });
      }
      const contextName = activeContext.trim();
      if (!contextName) return prev;
      const contextOverrides = { ...prev.dataplane.contextOverrides };
      const existing = contextOverrides[contextName];
      if (!existing) return prev;
      const cleaned = stripUndefinedDeep({ ...existing, signals: undefined });
      if (cleaned) contextOverrides[contextName] = cleaned;
      else delete contextOverrides[contextName];
      return { ...prev, dataplane: { ...prev.dataplane, contextOverrides } };
    });
  };

  const importSettingsText = (text: string) => {
    try {
      const imported = parseUserSettingsJSON(text);
      if (!window.confirm("Import settings and overwrite the current settings profile?")) return;
      replaceSettings(imported);
      setImportText(text);
      setImportMessage({ severity: "success", text: "Settings imported." });
    } catch (err) {
      setImportMessage({ severity: "error", text: (err as Error).message || "Import failed." });
    }
  };

  const importSettingsFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      importSettingsText(text);
    } catch (err) {
      setImportMessage({ severity: "error", text: (err as Error).message || "Failed to read settings file." });
    }
  };

  const renderAppearance = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Typography variant="h6">Appearance</Typography>
      <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.appearance.smartFiltersEnabled}
              onChange={(e) =>
                setSettings((prev) =>
                  updateAppearance(prev, { smartFiltersEnabled: e.target.checked }),
                )
              }
            />
          }
          label="Smart filters"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.appearance.releaseChecksEnabled}
              onChange={(e) =>
                setSettings((prev) =>
                  updateAppearance(prev, { releaseChecksEnabled: e.target.checked }),
                )
              }
            />
          }
          label="Check for kview updates"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.appearance.yamlSmartCollapse}
              onChange={(e) =>
                setSettings((prev) =>
                  updateAppearance(prev, { yamlSmartCollapse: e.target.checked }),
                )
              }
            />
          }
          label="Smart YAML collapse"
          title="Auto-collapses noisy sections (e.g. managedFields) in resource YAML panels and enables per-block fold toggles"
        />
        <TextField
          select
          size="small"
          label="Initial activity panel state"
          value={settings.appearance.activityPanelInitiallyOpen ? "expanded" : "collapsed"}
          onChange={(e) =>
            setSettings((prev) =>
              updateAppearance(prev, { activityPanelInitiallyOpen: e.target.value === "expanded" }),
            )
          }
          helperText="Used when the app starts. The current panel can still be opened or collapsed manually."
          sx={{ maxWidth: 320 }}
        >
          <MenuItem value="expanded">Expanded</MenuItem>
          <MenuItem value="collapsed">Collapsed</MenuItem>
        </TextField>
      </Paper>
    </Box>
  );

  const renderRule = (rule: SmartFilterRule, index: number) => {
    const error = rulePatternError(rule);
    const resourceOptions = smartFilterResourceKeysForScope(rule.scope);
    return (
      <Paper key={rule.id} variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={headerRowSx}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Rule {index + 1}
          </Typography>
          <ReorderButtons
            label={`rule ${index + 1}`}
            index={index}
            lastIndex={settings.smartFilters.rules.length - 1}
            onUp={() => setSettings((prev) => updateSmartFilters(prev, { rules: moveItem(prev.smartFilters.rules, index, -1) }))}
            onDown={() => setSettings((prev) => updateSmartFilters(prev, { rules: moveItem(prev.smartFilters.rules, index, 1) }))}
            onRemove={() =>
              setSettings((prev) =>
                updateSmartFilters(prev, { rules: prev.smartFilters.rules.filter((_, i) => i !== index) }),
              )
            }
          />
        </Box>
        <FormControlLabel
          control={<Switch checked={rule.enabled} onChange={(e) => setRule(index, { enabled: e.target.checked })} />}
          label="Enabled"
        />
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <TextField
            select
            size="small"
            label="Context scope"
            value={rule.context || "__all"}
            onChange={(e) => setRule(index, { context: e.target.value === "__all" ? "" : e.target.value })}
          >
            <MenuItem value="__all">All contexts</MenuItem>
            {contextOptions.map((ctx) => (
              <MenuItem key={ctx} value={ctx}>
                {ctx}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Cluster scope"
            value={rule.scope}
            onChange={(e) => {
              const scope = e.target.value as SettingsScopeMode;
              const allowed = new Set(smartFilterResourceKeysForScope(scope));
              setRule(index, {
                scope,
                resources: rule.resources.filter((key) => allowed.has(key)),
              });
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="cluster">Cluster-scoped lists</MenuItem>
            <MenuItem value="namespace">Namespace-scoped lists</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Namespace"
            value={rule.namespace || "__any"}
            onChange={(e) => setRule(index, { namespace: e.target.value === "__any" ? "" : e.target.value })}
            disabled={rule.scope !== "namespace"}
            helperText={rule.scope === "namespace" ? "Leave as Any namespace for all namespace-scoped lists." : "Only used for namespace-scoped rules."}
          >
            <MenuItem value="__any">Any namespace</MenuItem>
            {namespaceOptions.map((ns) => (
              <MenuItem key={ns} value={ns}>
                {ns}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Resource scope"
            value={rule.resourceScope}
            onChange={(e) => setRule(index, { resourceScope: e.target.value as SettingsResourceScopeMode })}
          >
            <MenuItem value="any">Any resource</MenuItem>
            <MenuItem value="selected">Selected resources</MenuItem>
          </TextField>
        </Box>
        {rule.resourceScope === "selected" ? (
          <FormControl size="small">
            <InputLabel id={`resources-${rule.id}`}>Resources</InputLabel>
            <Select
              labelId={`resources-${rule.id}`}
              multiple
              label="Resources"
              value={rule.resources}
              onChange={(e: SelectChangeEvent<ListResourceKey[]>) => {
                const value = e.target.value;
                setRule(index, { resources: typeof value === "string" ? [value as ListResourceKey] : value });
              }}
              renderValue={(selected) => selected.map((key) => getResourceLabel(key)).join(", ")}
            >
              {resourceOptions.map((key) => (
                <MenuItem key={key} value={key}>
                  <Checkbox checked={rule.resources.includes(key)} />
                  <ListItemText primary={getResourceLabel(key)} />
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              {smartFilterResourceHelperText(rule.scope)}
            </Typography>
          </FormControl>
        ) : null}
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "minmax(260px, 2fr) minmax(120px, 0.6fr) minmax(180px, 1fr)" }}>
          <TextField
            size="small"
            label="Regex match pattern"
            value={rule.pattern}
            onChange={(e) => setRule(index, { pattern: e.target.value })}
            error={Boolean(error)}
            helperText={error ?? "Matched against the row name."}
          />
          <TextField
            size="small"
            label="Flags"
            value={rule.flags}
            onChange={(e) => setRule(index, { flags: sanitizeRegexFlags(e.target.value) })}
            helperText="Allowed: d g i m s u v y"
          />
          <TextField
            size="small"
            label="Display template"
            value={rule.display}
            onChange={(e) => setRule(index, { display: e.target.value })}
            helperText="JavaScript replacement syntax, e.g. $1."
          />
        </Box>
      </Paper>
    );
  };

  const renderSmartFilters = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">Smart Filters</Typography>
          <Typography variant="body2" color="text.secondary">
            Rules are evaluated in order. Each row stops at the first matching rule.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() =>
            setSettings((prev) =>
              updateSmartFilters(prev, { rules: [...prev.smartFilters.rules, newSmartFilterRule()] }),
            )
          }
        >
          Add rule
        </Button>
      </Box>
      <Paper variant="outlined" sx={{ p: 1.25, display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          type="number"
          label="Minimum rows per chip"
          value={settings.smartFilters.minCount}
          onChange={(e) =>
            setSettings((prev) =>
              updateSmartFilters(prev, {
                minCount: Math.max(1, Math.min(50, Math.round(Number(e.target.value) || 1))),
              }),
            )
          }
          sx={{ width: 220 }}
        />
        <Typography variant="body2" color="text.secondary">
          Current quick filter chips are generated from these rules when smart filters are enabled.
        </Typography>
      </Paper>
      {settings.smartFilters.rules.map(renderRule)}
    </Box>
  );

  const renderCommand = (command: CustomCommandDefinition, index: number) => {
    const patternError = commandPatternError(command);
    return (
      <Paper key={command.id} variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={headerRowSx}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Command {index + 1}
          </Typography>
          <ReorderButtons
            label={`command ${index + 1}`}
            index={index}
            lastIndex={settings.customCommands.commands.length - 1}
            onUp={() =>
              setSettings((prev) =>
                updateCustomCommands(prev, {
                  commands: moveItem(prev.customCommands.commands, index, -1),
                }),
              )
            }
            onDown={() =>
              setSettings((prev) =>
                updateCustomCommands(prev, {
                  commands: moveItem(prev.customCommands.commands, index, 1),
                }),
              )
            }
            onRemove={() =>
              setSettings((prev) =>
                updateCustomCommands(prev, {
                  commands: prev.customCommands.commands.filter((_, i) => i !== index),
                }),
              )
            }
          />
        </Box>
        <FormControlLabel
          control={
            <Switch checked={command.enabled} onChange={(e) => setCommand(index, { enabled: e.target.checked })} />
          }
          label="Enabled"
        />
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <TextField
            size="small"
            label="Name"
            value={command.name}
            onChange={(e) => setCommand(index, { name: e.target.value })}
            helperText="Shown in the container command menu."
          />
          <TextField
            size="small"
            label="Container pattern"
            value={command.containerPattern}
            onChange={(e) => setCommand(index, { containerPattern: e.target.value })}
            error={Boolean(patternError)}
            helperText={patternError ?? "Optional regex matched against the container name."}
          />
          <TextField
            size="small"
            label="Workdir"
            value={command.workdir}
            onChange={(e) => setCommand(index, { workdir: e.target.value })}
            helperText="Optional. Leave blank to use the container default."
          />
        </Box>
        <TextField
          size="small"
          label="Command"
          value={command.command}
          onChange={(e) => setCommand(index, { command: e.target.value })}
          error={!command.command.trim()}
          helperText="Executed with /bin/sh -lc inside the selected container."
          fullWidth
        />
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <TextField
            select
            size="small"
            label="Output type"
            value={command.outputType}
            onChange={(e) => setCommand(index, { outputType: e.target.value as CustomCommandOutputType })}
          >
            <MenuItem value="text">Free text</MenuItem>
            <MenuItem value="keyValue">Key-value</MenuItem>
            <MenuItem value="csv">CSV / delimited table</MenuItem>
            <MenuItem value="code">Code / JSON / YAML</MenuItem>
            <MenuItem value="file">File download</MenuItem>
          </TextField>
          {command.outputType === "code" ? (
            <TextField
              size="small"
              label="Code language"
              value={command.codeLanguage}
              onChange={(e) => setCommand(index, { codeLanguage: e.target.value })}
              helperText="Examples: json, yaml, php, shell. Leave blank to auto-detect common formats."
            />
          ) : null}
          {command.outputType === "file" ? (
            <>
              <TextField
                size="small"
                label="File name"
                value={command.fileName}
                onChange={(e) => setCommand(index, { fileName: e.target.value })}
                helperText="Used for the downloaded output."
              />
              <FormControlLabel
                control={
                  <Switch checked={command.compress} onChange={(e) => setCommand(index, { compress: e.target.checked })} />
                }
                label="Compress with gzip"
              />
            </>
          ) : null}
          <TextField
            select
            size="small"
            label="Safety"
            value={command.safety}
            onChange={(e) => setCommand(index, { safety: e.target.value as CustomCommandSafety })}
            helperText="Dangerous commands require typed confirmation before execution."
          >
            <MenuItem value="safe">Safe: simple confirmation</MenuItem>
            <MenuItem value="dangerous">Dangerous: typed confirmation</MenuItem>
          </TextField>
        </Box>
      </Paper>
    );
  };

  const renderCustomCommands = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">Custom Commands</Typography>
          <Typography variant="body2" color="text.secondary">
            Commands are stored in this browser profile and become available on matching Pod containers.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() =>
            setSettings((prev) =>
              updateCustomCommands(prev, {
                commands: [...prev.customCommands.commands, newCustomCommandDefinition()],
              }),
            )
          }
        >
          Add command
        </Button>
      </Box>
      {settings.customCommands.commands.length === 0 ? (
        <Paper variant="outlined" sx={panelBoxSx}>
          <Typography variant="body2" color="text.secondary">
            No custom commands are defined.
          </Typography>
        </Paper>
      ) : (
        settings.customCommands.commands.map(renderCommand)
      )}
    </Box>
  );

  const renderAction = (action: CustomActionDefinition, index: number) => {
    const patternError = actionPatternError(action);
    const patchError = actionPatchError(action);
    return (
      <Paper key={action.id} variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={headerRowSx}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Action {index + 1}
          </Typography>
          <ReorderButtons
            label={`action ${index + 1}`}
            index={index}
            lastIndex={settings.customActions.actions.length - 1}
            onUp={() => setSettings((prev) => updateCustomActions(prev, { actions: moveItem(prev.customActions.actions, index, -1) }))}
            onDown={() => setSettings((prev) => updateCustomActions(prev, { actions: moveItem(prev.customActions.actions, index, 1) }))}
            onRemove={() => setSettings((prev) => updateCustomActions(prev, { actions: prev.customActions.actions.filter((_, i) => i !== index) }))}
          />
        </Box>
        <FormControlLabel
          control={<Switch checked={action.enabled} onChange={(e) => setAction(index, { enabled: e.target.checked })} />}
          label="Enabled"
        />
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <TextField size="small" label="Name" value={action.name} onChange={(e) => setAction(index, { name: e.target.value })} />
          <TextField
            select
            size="small"
            label="Action"
            value={action.action}
            onChange={(e) => {
              const nextAction = e.target.value as CustomActionKind;
              setAction(index, {
                action: nextAction,
                ...(nextAction === "unset" && action.target === "image" ? { target: "env" as const } : {}),
              });
            }}
          >
            <MenuItem value="set">Set</MenuItem>
            <MenuItem value="unset">Unset</MenuItem>
            <MenuItem value="patch">Patch</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Safety"
            value={action.safety}
            onChange={(e) => setAction(index, { safety: e.target.value as CustomCommandSafety })}
          >
            <MenuItem value="safe">Safe: simple confirmation</MenuItem>
            <MenuItem value="dangerous">Dangerous: typed confirmation</MenuItem>
          </TextField>
        </Box>
        <FormControl size="small">
          <InputLabel id={`action-resources-${action.id}`}>Resources</InputLabel>
          <Select
            labelId={`action-resources-${action.id}`}
            multiple
            label="Resources"
            value={action.resources}
            onChange={(e: SelectChangeEvent<ListResourceKey[]>) => {
              const value = e.target.value;
              setAction(index, { resources: typeof value === "string" ? [value as ListResourceKey] : value });
            }}
            renderValue={(selected) => selected.map((key) => getResourceLabel(key)).join(", ")}
          >
            {customActionResourceKeys.map((key) => (
              <MenuItem key={key} value={key}>
                <Checkbox checked={action.resources.includes(key)} />
                <ListItemText primary={getResourceLabel(key)} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {action.action === "patch" ? (
          <>
            <TextField
              select
              size="small"
              label="Patch type"
              value={action.patchType}
              onChange={(e) => setAction(index, { patchType: e.target.value as CustomActionPatchType })}
              sx={{ maxWidth: 240 }}
            >
              <MenuItem value="merge">Merge patch</MenuItem>
              <MenuItem value="json">JSON patch</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="Patch body JSON"
              value={action.patchBody}
              onChange={(e) => setAction(index, { patchBody: e.target.value })}
              error={Boolean(patchError)}
              helperText={patchError ?? "Use JSON. JSON patch expects an array of operations; merge patch expects an object."}
              multiline
              minRows={8}
              fullWidth
              InputProps={{ sx: { fontFamily: "monospace", fontSize: "0.85rem" } }}
            />
          </>
        ) : (
          <>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <TextField
                select
                size="small"
                label="Target"
                value={action.target}
                onChange={(e) => setAction(index, { target: e.target.value as CustomActionTarget })}
              >
                <MenuItem value="env">Environment variable</MenuItem>
                <MenuItem value="image" disabled={action.action === "unset"}>Container image</MenuItem>
              </TextField>
              {action.target === "env" ? (
                <TextField size="small" label="Env key" value={action.key} onChange={(e) => setAction(index, { key: e.target.value })} />
              ) : null}
              <TextField
                size="small"
                label="Container pattern"
                value={action.containerPattern}
                onChange={(e) => setAction(index, { containerPattern: e.target.value })}
                error={Boolean(patternError)}
                helperText={patternError ?? "Optional regex. Leave blank for all containers."}
              />
            </Box>
            {action.action === "set" ? (
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "minmax(220px, 1fr) auto" }}>
                <TextField
                  size="small"
                  label={action.target === "image" ? "Image" : "Value"}
                  value={action.value}
                  onChange={(e) => setAction(index, { value: e.target.value })}
                  disabled={action.runtimeValue}
                />
                <FormControlLabel
                  control={<Switch checked={action.runtimeValue} onChange={(e) => setAction(index, { runtimeValue: e.target.checked })} />}
                  label="Ask at runtime"
                />
              </Box>
            ) : null}
          </>
        )}
      </Paper>
    );
  };

  const renderCustomActions = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">Custom Actions</Typography>
          <Typography variant="body2" color="text.secondary">
            Actions are browser-local presets for patch-capable workload resources.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setSettings((prev) => updateCustomActions(prev, { actions: [...prev.customActions.actions, newCustomActionDefinition()] }))}
        >
          Add action
        </Button>
      </Box>
      {settings.customActions.actions.length === 0 ? (
        <Paper variant="outlined" sx={panelBoxSx}>
          <Typography variant="body2" color="text.secondary">
            No custom actions are defined.
          </Typography>
        </Paper>
      ) : (
        settings.customActions.actions.map(renderAction)
      )}
    </Box>
  );

  const currentContextOverride = settings.dataplane.contextOverrides[activeContext.trim()] || {};
  const isContextEditing = dataplaneEditScope === "context" && Boolean(activeContext.trim());
  const getOverrideAtPath = (path: string[]): unknown => {
    let cursor: unknown = currentContextOverride;
    for (const key of path) {
      if (!isPlainObject(cursor) || !(key in cursor)) return undefined;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return cursor;
  };
  const hasOverrideAtPath = (path: string[]): boolean => getOverrideAtPath(path) !== undefined;
  const resetOverridePath = (path: string[]) => {
    if (!isContextEditing) return;
    setSettings((prev) =>
      updateContextDataplaneOverride(prev, (current) => {
        const next = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
        let cursor: Record<string, unknown> = next;
        for (let i = 0; i < path.length - 1; i += 1) {
          const key = path[i];
          if (!isPlainObject(cursor[key])) return current;
          cursor = cursor[key] as Record<string, unknown>;
        }
        delete cursor[path[path.length - 1]];
        return next as DataplaneContextOverrideSettings;
      }),
    );
  };
  const resetOverrideSection = (sectionKey: keyof DataplaneContextOverrideSettings) => resetOverridePath([sectionKey]);

  const fieldOverrideMeta = (overridePath: string[], resetTitle = "Reset to global") => {
    if (!isContextEditing) return null;
    const overridden = hasOverrideAtPath(overridePath);
    return (
      <Box sx={overrideMetaRowSx}>
        <Typography variant="caption" color="text.secondary">
          {overridden ? "Overridden" : "Inherited"}
        </Typography>
        {overridden ? (
          <Tooltip title={resetTitle}>
            <IconButton size="small" onClick={() => resetOverridePath(overridePath)} aria-label={resetTitle}>
              <RestartAltIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
    );
  };

  const numField = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    helperText?: string,
    hint?: string,
    overridePath?: string[],
  ) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <TextField
        size="small"
        type="number"
        label={hint ? labelWithHint(label, hint) : label}
        value={value}
        onChange={(e) => onChange(Math.round(Number(e.target.value) || 0))}
        helperText={helperText}
      />
      {isContextEditing && overridePath ? fieldOverrideMeta(overridePath) : null}
    </Box>
  );

  const toggleField = (
    checked: boolean,
    onChange: (checked: boolean) => void,
    label: React.ReactNode,
    overridePath: string[],
  ) => (
    <Box sx={overrideControlBlockSx}>
      <FormControlLabel
        control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={label}
      />
      {fieldOverrideMeta(overridePath)}
    </Box>
  );

  const labelWithHint = (label: string, hint: string) => (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      {label}
      <InfoHint title={hint} />
    </Box>
  );

  const sectionTitle = (title: string, hint: string) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Typography variant="subtitle2">{title}</Typography>
      <InfoHint title={hint} />
    </Box>
  );

  const renderDataplane = () => {
    const contextName = activeContext.trim();
    const activeContextOverride = contextName ? (settings.dataplane.contextOverrides[contextName] || {}) : {};
    const contextSignals = activeContextOverride.signals?.overrides || {};
    const dp = dataplaneEditScope === "context"
      ? dataplaneSettingsForContext(settings.dataplane, contextName)
      : settings.dataplane.global;
    const ne = dp.namespaceEnrichment;
    const sweep = ne.sweep;
    const signalDefaults = defaultDataplaneSettings().signals;
    const profileLabel = dataplaneProfileLabel(dp.profile);
    const profileEnrichmentText = dataplaneProfileEnrichmentText(dp.profile);
    const estimatedSweepHours = sweep.maxNamespacesPerHour > 0 && namespaces.length > 0
      ? Math.ceil(namespaces.length / sweep.maxNamespacesPerHour)
      : 0;
    const activeContextSignalOverrides = contextSignals;
    const filteredSignalCatalog = signalCatalog.filter((item) => {
      const q = signalCatalogQuery.trim().toLowerCase();
      if (!q) return true;
      return [
        item.type,
        item.label,
        item.defaultSeverity,
        item.effectiveSeverity,
        item.likelyCause,
        item.suggestedAction,
      ].some((value) => String(value || "").toLowerCase().includes(q));
    });
    const severityColor = (severity?: string): "error" | "warning" | "info" | "default" => {
      switch (severity) {
        case "high":
          return "error";
        case "medium":
          return "warning";
        case "low":
          return "info";
        default:
          return "default";
      }
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box>
          <Typography variant="h6">Dataplane</Typography>
          <Typography variant="body2" color="text.secondary">
            Dataplane controls cached Kubernetes snapshots, namespace enrichment, metrics sampling, and the signals derived
            from that data.
          </Typography>
          <Box sx={{ mt: 1 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={dataplaneEditScope}
              onChange={(_, value: "global" | "context" | null) => {
                if (!value) return;
                setDataplaneEditScope(value);
              }}
            >
              <ToggleButton value="global">Global defaults</ToggleButton>
              <ToggleButton value="context" disabled={!activeContext}>This context</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {dataplaneEditScope === "context" && activeContext
                ? `Editing sparse overrides for ${activeContext}. Unchanged fields inherit from global defaults.`
                : "Editing global defaults shared by all contexts without local overrides."}
            </Typography>
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ px: 1, pt: 0.5 }}>
          <Tabs
            value={dataplaneTab}
            onChange={(_, value: DataplaneTab) => setDataplaneTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Dataplane settings groups"
          >
            <Tab value="overview" label="Overview" />
            <Tab value="enrichment" label="Enrichment" />
            <Tab value="metrics" label="Metrics" />
            <Tab value="signals" label="Signals" />
            <Tab value="cache" label="Cache" />
          </Tabs>
        </Paper>

        {dataplaneTab === "overview" ? (
        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            {sectionTitle(
              "Profile and Scheduler",
              "Profiles tune observers, enrichment scope, sweep behavior, and scheduler limits together. Manual keeps cached dataplane reads but turns off automatic background work.",
            )}
            {isContextEditing ? (
              <Tooltip title="Reset section to global">
                <span>
                  <IconButton
                    size="small"
                    disabled={!hasOverrideAtPath(["profile"]) && !hasOverrideAtPath(["backgroundBudget"])}
                    onClick={() => { resetOverridePath(["profile"]); resetOverrideSection("backgroundBudget"); }}
                    aria-label="Reset section to global"
                  >
                    <RestartAltIcon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </Box>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <TextField
                select
                size="small"
                label={labelWithHint("Dataplane profile", "Choose the overall dataplane behavior. Profile changes preserve operator-tuned metrics, signals, and persistence settings.")}
                value={dp.profile}
                onChange={(e) => {
                  const nextProfile = e.target.value as DataplaneProfile;
                  if (dataplaneEditScope === "global") {
                    setSettings((prev) => updateDataplane(prev, applyDataplaneProfile(prev.dataplane.global, nextProfile)));
                    return;
                  }
                  setDataplanePrimitive("profile", nextProfile);
                }}
                helperText="Manual keeps dataplane snapshots but disables background enhancement."
              >
                <MenuItem value="manual">Manual: user interaction only</MenuItem>
                <MenuItem value="focused">Focused: current, recent, favourites</MenuItem>
                <MenuItem value="balanced">Balanced</MenuItem>
                <MenuItem value="wide">Wide</MenuItem>
                <MenuItem value="diagnostic">Diagnostic</MenuItem>
              </TextField>
              {fieldOverrideMeta(["profile"])}
            </Box>
            {numField("Scheduler concurrency", dp.backgroundBudget.maxConcurrentPerCluster, (value) =>
              setDataplaneBudget({ maxConcurrentPerCluster: value }),
              "Max snapshot workers per cluster.",
              "Upper bound for all dataplane snapshot work running at once per cluster.",
              ["backgroundBudget", "maxConcurrentPerCluster"],
            )}
            {numField("Background concurrency", dp.backgroundBudget.maxBackgroundConcurrentPerCluster, (value) =>
              setDataplaneBudget({ maxBackgroundConcurrentPerCluster: value }),
              "Max background workers per cluster.",
              "Upper bound for non-interactive enrichment and sweep work per cluster.",
              ["backgroundBudget", "maxBackgroundConcurrentPerCluster"],
            )}
            {numField("Long-run notice (sec)", dp.backgroundBudget.longRunNoticeSec, (value) =>
              setDataplaneBudget({ longRunNoticeSec: value }),
              "0 disables long-running snapshot activity notices.",
              "How long snapshot work can run before the activity panel calls attention to it.",
              ["backgroundBudget", "longRunNoticeSec"],
            )}
            {numField("Transient retries", dp.backgroundBudget.transientRetries, (value) =>
              setDataplaneBudget({ transientRetries: value }),
              undefined,
              "Retry budget for transient dataplane list failures before surfacing the error.",
              ["backgroundBudget", "transientRetries"],
            )}
          </Box>
        </Paper>
        ) : null}

        {dataplaneTab === "enrichment" ? (
        <>
        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          {sectionTitle(
            `${profileLabel} Namespace Enrichment`,
            "Enrichment warms namespace snapshots ahead of direct navigation. Profile defaults set the breadth; these controls let you tune the current browser profile.",
          )}
          <Typography variant="body2" color="text.secondary">
            {profileEnrichmentText}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {toggleField(ne.enabled, (checked) => setNamespaceEnrichment({ enabled: checked }), labelWithHint("Enabled", "Allows automatic namespace enrichment for selected targets. Manual profile disables this by default."), ["namespaceEnrichment", "enabled"])}
            {toggleField(ne.includeFocus, (checked) => setNamespaceEnrichment({ includeFocus: checked }), labelWithHint("Current namespace", "Keep the active namespace at the front of the enrichment queue."), ["namespaceEnrichment", "includeFocus"])}
            {toggleField(ne.includeRecent, (checked) => setNamespaceEnrichment({ includeRecent: checked }), labelWithHint("Recent", "Include recently visited namespaces as enrichment targets."), ["namespaceEnrichment", "includeRecent"])}
            {toggleField(ne.includeFavourites, (checked) => setNamespaceEnrichment({ includeFavourites: checked }), labelWithHint("Favourites", "Include favourited namespaces as enrichment targets."), ["namespaceEnrichment", "includeFavourites"])}
          </Box>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {numField("Max targets", ne.maxTargets, (value) => setNamespaceEnrichment({ maxTargets: value }), undefined, "Maximum namespaces considered for focused enrichment in one planning pass.", ["namespaceEnrichment", "maxTargets"])}
            {numField("Max parallel", ne.maxParallel, (value) => setNamespaceEnrichment({ maxParallel: value }), undefined, "Maximum focused enrichment workers running at once.", ["namespaceEnrichment", "maxParallel"])}
            {numField("Idle quiet (ms)", ne.idleQuietMs, (value) => setNamespaceEnrichment({ idleQuietMs: value }), undefined, "How long the UI should be quiet before background enrichment starts.", ["namespaceEnrichment", "idleQuietMs"])}
            {numField("Poll interval (ms)", ne.pollMs, (value) => setNamespaceEnrichment({ pollMs: value }), undefined, "How often the UI polls enrichment progress while work is active.", ["namespaceEnrichment", "pollMs"])}
            {numField("Recent hint limit", ne.recentLimit, (value) => setNamespaceEnrichment({ recentLimit: value }), undefined, "Maximum recent namespaces eligible for focused enrichment.", ["namespaceEnrichment", "recentLimit"])}
            {numField("Favourite hint limit", ne.favouriteLimit, (value) => setNamespaceEnrichment({ favouriteLimit: value }), undefined, "Maximum favourite namespaces eligible for focused enrichment.", ["namespaceEnrichment", "favouriteLimit"])}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {toggleField(ne.enrichDetails, (checked) => setNamespaceEnrichment({ enrichDetails: checked }), labelWithHint("Namespace details", "Warm namespace detail snapshots used by summaries and navigation hints."), ["namespaceEnrichment", "enrichDetails"])}
            {toggleField(ne.enrichPods, (checked) => setNamespaceEnrichment({ enrichPods: checked }), labelWithHint("Pods", "Warm pod snapshots for namespace summaries, workload projections, and pod-derived signals."), ["namespaceEnrichment", "enrichPods"])}
            {toggleField(ne.enrichDeployments, (checked) => setNamespaceEnrichment({ enrichDeployments: checked }), labelWithHint("Deployments", "Warm deployment snapshots for rollout projections and namespace workload summaries."), ["namespaceEnrichment", "enrichDeployments"])}
          </Box>
          <FormControl size="small" fullWidth>
            <InputLabel id="namespace-warm-kinds-label">
              {labelWithHint("Resource snapshots warmed by enrichment", "Namespaced list kinds that enrichment will keep warm for selected namespace targets.")}
            </InputLabel>
            <Select
              labelId="namespace-warm-kinds-label"
              multiple
              label="Resource snapshots warmed by enrichment"
              value={ne.warmResourceKinds}
              onChange={(e: SelectChangeEvent<string[]>) => {
                const value = e.target.value;
                setNamespaceEnrichment({
                  warmResourceKinds: typeof value === "string" ? value.split(",") : value,
                });
              }}
              renderValue={(selected) => selected.map(dataplaneWarmResourceLabel).join(", ")}
            >
              {dataplaneNamespaceWarmResourceKeys.map((kind) => (
                <MenuItem key={kind} value={kind}>
                  <Checkbox checked={ne.warmResourceKinds.includes(kind)} />
                  <ListItemText primary={dataplaneWarmResourceLabel(kind)} />
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Focused defaults to pods and deployments. Wide and diagnostic warm every namespaced dataplane list kind slowly within the same target and sweep caps.
            </Typography>
          </FormControl>
          {fieldOverrideMeta(["namespaceEnrichment", "warmResourceKinds"])}
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          {sectionTitle(
            "Background Namespace Sweep",
            `Sweep slowly enriches namespaces outside the focused set while the app is idle. On this context, ${namespaces.length || "unknown"} namespaces would take about ${estimatedSweepHours || "?"} idle hour(s) at the current hourly cap.`,
          )}
          {toggleField(sweep.enabled, (checked) => setNamespaceSweep({ enabled: checked }), labelWithHint("Enable background sweep", "Allows slow idle discovery across namespaces that are not current, recent, or favourites."), ["namespaceEnrichment", "sweep", "enabled"])}
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {numField("Idle quiet (ms)", sweep.idleQuietMs, (value) => setNamespaceSweep({ idleQuietMs: value }), undefined, "How long the app should be idle before sweep work starts.", ["namespaceEnrichment", "sweep", "idleQuietMs"])}
            {numField("Namespaces / cycle", sweep.maxNamespacesPerCycle, (value) => setNamespaceSweep({ maxNamespacesPerCycle: value }), undefined, "Maximum namespaces selected for each sweep planning cycle.", ["namespaceEnrichment", "sweep", "maxNamespacesPerCycle"])}
            {numField("Namespaces / hour", sweep.maxNamespacesPerHour, (value) => setNamespaceSweep({ maxNamespacesPerHour: value }), undefined, "Hourly cap that keeps sweep work gentle on large clusters.", ["namespaceEnrichment", "sweep", "maxNamespacesPerHour"])}
            {numField("Re-enrich after (min)", sweep.minReenrichIntervalMinutes, (value) => setNamespaceSweep({ minReenrichIntervalMinutes: value }), undefined, "Minimum age before a namespace is eligible for sweep enrichment again.", ["namespaceEnrichment", "sweep", "minReenrichIntervalMinutes"])}
            {numField("Max parallel", sweep.maxParallel, (value) => setNamespaceSweep({ maxParallel: value }), undefined, "Maximum sweep workers running at once.", ["namespaceEnrichment", "sweep", "maxParallel"])}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {toggleField(sweep.pauseOnUserActivity, (checked) => setNamespaceSweep({ pauseOnUserActivity: checked }), labelWithHint("Pause on activity", "Stop sweep work while the operator is actively navigating or filtering."), ["namespaceEnrichment", "sweep", "pauseOnUserActivity"])}
            {toggleField(sweep.pauseWhenSchedulerBusy, (checked) => setNamespaceSweep({ pauseWhenSchedulerBusy: checked }), labelWithHint("Pause when busy", "Stop sweep work while the dataplane scheduler is already occupied."), ["namespaceEnrichment", "sweep", "pauseWhenSchedulerBusy"])}
            {toggleField(sweep.pauseOnRateLimitOrConnectivityIssues, (checked) => setNamespaceSweep({ pauseOnRateLimitOrConnectivityIssues: checked }), labelWithHint("Pause on rate limits", "Stop sweep work when recent requests suggest rate limiting or connectivity trouble."), ["namespaceEnrichment", "sweep", "pauseOnRateLimitOrConnectivityIssues"])}
            {toggleField(sweep.includeSystemNamespaces, (checked) => setNamespaceSweep({ includeSystemNamespaces: checked }), labelWithHint("Include system namespaces", "Allows sweep to include kube-system and other system namespaces."), ["namespaceEnrichment", "sweep", "includeSystemNamespaces"])}
          </Box>
        </Paper>
        </>
        ) : null}

        {dataplaneTab === "overview" ? (
        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          {sectionTitle(
            "Observers and Dashboard",
            "Observers keep cluster-wide namespace and node snapshots reasonably fresh. Dashboard controls decide how cached dataplane data is summarized.",
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {toggleField(dp.observers.enabled, (checked) => setDataplaneObservers({ enabled: checked }), labelWithHint("Observers", "Master switch for passive namespace and node observers."), ["observers", "enabled"])}
            {toggleField(dp.observers.namespacesEnabled, (checked) => setDataplaneObservers({ namespacesEnabled: checked }), labelWithHint("Namespace observer", "Periodically refreshes the namespace list snapshot for the active cluster."), ["observers", "namespacesEnabled"])}
            {toggleField(dp.observers.nodesEnabled, (checked) => setDataplaneObservers({ nodesEnabled: checked }), labelWithHint("Node observer", "Periodically refreshes node snapshots when node list access is available."), ["observers", "nodesEnabled"])}
            {toggleField(dp.dashboard.useCachedTotalsOnly, (checked) => setDataplaneDashboard({ useCachedTotalsOnly: checked }), labelWithHint("Use cached dashboard totals", "Uses only cached namespace list snapshots for dashboard resource totals instead of triggering broader reads."), ["dashboard", "useCachedTotalsOnly"])}
          </Box>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {numField("Namespace observer (sec)", dp.observers.namespacesIntervalSec, (value) => setDataplaneObservers({ namespacesIntervalSec: value }), undefined, "Seconds between passive namespace list refreshes.", ["observers", "namespacesIntervalSec"])}
            {numField("Node observer (sec)", dp.observers.nodesIntervalSec, (value) => setDataplaneObservers({ nodesIntervalSec: value }), undefined, "Seconds between passive node list refreshes.", ["observers", "nodesIntervalSec"])}
            {numField("Node backoff max (sec)", dp.observers.nodesBackoffMaxSec, (value) => setDataplaneObservers({ nodesBackoffMaxSec: value }), undefined, "Maximum node observer backoff after access or connectivity failures.", ["observers", "nodesBackoffMaxSec"])}
            {numField("Dashboard refresh (sec)", dp.dashboard.refreshSec, (value) => setDataplaneDashboard({ refreshSec: value }), undefined, "Dataplane dashboard refresh interval in seconds.", ["dashboard", "refreshSec"])}
            {numField(
              "Restart threshold",
              dp.signals.detectors.pod_restarts.restartCount,
              (value) =>
                setDataplaneSignals({
                  detectors: { ...dp.signals.detectors, pod_restarts: { restartCount: value } },
                }),
              undefined,
              "Pod restart count above which dashboard restart signals become elevated.",
              ["signals", "detectors", "pod_restarts", "restartCount"],
            )}
            {numField("Signal limit", dp.dashboard.signalLimit, (value) => setDataplaneDashboard({ signalLimit: value }), undefined, "Maximum number of top dashboard signals shown by default.", ["dashboard", "signalLimit"])}
          </Box>
        </Paper>
        ) : null}

        {dataplaneTab === "cache" ? (
        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          {sectionTitle(
            "Persisted Dataplane Cache",
            "Persisted snapshots keep the last observed list data on this device for restart recovery and cached quick access search. Results are stale until refreshed by the cluster.",
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {toggleField(dp.persistence.enabled, (checked) => setDataplanePersistence({ enabled: checked }), labelWithHint("Persist dataplane snapshots", "Stores eligible dataplane list snapshots on disk so kview can hydrate the cache on restart."), ["persistence", "enabled"])}
            {toggleField(dp.snapshots.manualRefreshBypassesTtl, (checked) => setDataplaneSnapshots({ manualRefreshBypassesTtl: checked }), labelWithHint("Manual refresh bypasses TTL", "A user-triggered refresh fetches live data even when the cached snapshot is still inside its TTL."), ["snapshots", "manualRefreshBypassesTtl"])}
            {toggleField(dp.snapshots.invalidateAfterKnownMutations, (checked) => setDataplaneSnapshots({ invalidateAfterKnownMutations: checked }), labelWithHint("Invalidate after known mutations", "Drops affected cached snapshots after kview performs a known mutating action."), ["snapshots", "invalidateAfterKnownMutations"])}
          </Box>
          {numField(
            "Max persisted age (hours)",
            dp.persistence.maxAgeHours,
            (value) => setDataplanePersistence({ maxAgeHours: value }),
            "Older snapshots are ignored and pruned from the persisted cache.",
            "Snapshots older than this age are not hydrated on restart and are removed from the bbolt cache during persistence cleanup.",
            ["persistence", "maxAgeHours"],
          )}
        </Paper>
        ) : null}

        {dataplaneTab === "metrics" ? (
        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          {sectionTitle(
            "Metrics (metrics.k8s.io)",
            "Real-time pod and node usage from metrics-server. Disabled automatically when the API is missing or RBAC denies it; this toggle adds a soft gate on top of capability detection.",
          )}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={dp.metrics.enabled}
                  onChange={(e) => {
                    if (dataplaneEditScope === "context") setContextMetricsEnabled(e.target.checked);
                    else setDataplaneMetrics({ enabled: e.target.checked });
                  }}
                />
              }
              label={labelWithHint("Enable metrics integration", "Allows dataplane to request metrics.k8s.io snapshots when the cluster and RBAC permit it.")}
            />
            {dataplaneEditScope === "context" ? (
              <>
                <Typography variant="caption" color="text.secondary">
                  {activeContextOverride.metrics?.enabled === undefined
                    ? `Inherited from global (${settings.dataplane.global.metrics.enabled ? "enabled" : "disabled"})`
                    : "Context override active"}
                </Typography>
                <Tooltip title="Reset to global">
                  <span>
                    <IconButton
                      size="small"
                      disabled={activeContextOverride.metrics?.enabled === undefined}
                      onClick={() => resetContextMetricsOverride()}
                      aria-label="Reset metrics enabled to global"
                    >
                      <RestartAltIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            ) : null}
          </Box>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            {numField(
              "Pod metrics TTL (sec)",
              dp.metrics.podMetricsTtlSec,
              (value) => setDataplaneMetrics({ podMetricsTtlSec: value }),
              "How often pod usage is sampled per cluster.",
              "Minimum age before pod metrics snapshots are refreshed.",
              ["metrics", "podMetricsTtlSec"],
            )}
            {numField(
              "Node metrics TTL (sec)",
              dp.metrics.nodeMetricsTtlSec,
              (value) => setDataplaneMetrics({ nodeMetricsTtlSec: value }),
              "How often node usage is sampled per cluster.",
              "Minimum age before node metrics snapshots are refreshed.",
              ["metrics", "nodeMetricsTtlSec"],
            )}
            {numField(
              "Container near-limit (%)",
              dp.signals.detectors.container_near_limit.percent,
              (value) =>
                setDataplaneSignals({
                  detectors: { ...dp.signals.detectors, container_near_limit: { percent: value } },
                }),
              "Threshold above which containers raise a usage signal.",
              "Percent of configured CPU or memory limit that triggers a near-limit container signal.",
              ["signals", "detectors", "container_near_limit", "percent"],
            )}
            {numField(
              "Node pressure (%)",
              dp.signals.detectors.node_resource_pressure.percent,
              (value) =>
                setDataplaneSignals({
                  detectors: { ...dp.signals.detectors, node_resource_pressure: { percent: value } },
                }),
              "Threshold above which nodes raise a resource-pressure signal.",
              "Percent of node allocatable CPU or memory that triggers a node pressure signal.",
              ["signals", "detectors", "node_resource_pressure", "percent"],
            )}
          </Box>
        </Paper>
        ) : null}

        {dataplaneTab === "signals" ? (
        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            {sectionTitle(
              "Signal Thresholds",
              "These values control when dataplane signals trigger. Defaults are applied automatically on first startup; use reset to return to system defaults.",
            )}
            <Tooltip title="Reset signal thresholds">
              <IconButton
                size="small"
                onClick={() => {
                  setDataplaneSignals(signalDefaults);
                }}
                aria-label="Reset signal thresholds"
              >
                <RestartAltIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {numField(
              "Long-running job (sec)",
              dp.signals.longRunningJobSec,
              (value) => setDataplaneSignals({ longRunningJobSec: value }),
              `Default: ${signalDefaults.longRunningJobSec}`,
              "Job runtime in seconds before a long-running job signal can fire.",
              ["signals", "longRunningJobSec"],
            )}
            {numField(
              "CronJob no recent success (sec)",
              dp.signals.cronJobNoRecentSuccessSec,
              (value) => setDataplaneSignals({ cronJobNoRecentSuccessSec: value }),
              `Default: ${signalDefaults.cronJobNoRecentSuccessSec}`,
              "Seconds without a recorded successful CronJob run before a signal can fire.",
              ["signals", "cronJobNoRecentSuccessSec"],
            )}
            {numField(
              "Stale Helm release (sec)",
              dp.signals.staleHelmReleaseSec,
              (value) => setDataplaneSignals({ staleHelmReleaseSec: value }),
              `Default: ${signalDefaults.staleHelmReleaseSec}`,
              "Seconds a Helm release can remain transitional before it is treated as stale.",
              ["signals", "staleHelmReleaseSec"],
            )}
            {numField(
              "Unused resource age (sec)",
              dp.signals.unusedResourceAgeSec,
              (value) => setDataplaneSignals({ unusedResourceAgeSec: value }),
              `Default: ${signalDefaults.unusedResourceAgeSec}`,
              "Minimum resource age before potentially-unused signals are considered.",
              ["signals", "unusedResourceAgeSec"],
            )}
            {numField(
              "Young pod restart window (sec)",
              dp.signals.podYoungRestartWindowSec,
              (value) => setDataplaneSignals({ podYoungRestartWindowSec: value }),
              `Default: ${signalDefaults.podYoungRestartWindowSec}`,
              "Pod age window used to identify young pods with frequent restarts.",
              ["signals", "podYoungRestartWindowSec"],
            )}
            {numField(
              "Deployment unavailable (sec)",
              dp.signals.deploymentUnavailableSec,
              (value) => setDataplaneSignals({ deploymentUnavailableSec: value }),
              `Default: ${signalDefaults.deploymentUnavailableSec}`,
              "Seconds a Deployment can stay unavailable before an unavailable deployment signal can fire.",
              ["signals", "deploymentUnavailableSec"],
            )}
            {numField(
              "Quota warn (%)",
              dp.signals.quotaWarnPercent,
              (value) => setDataplaneSignals({ quotaWarnPercent: value }),
              `Default: ${signalDefaults.quotaWarnPercent}`,
              "Quota usage percent that marks quota pressure as warning.",
              ["signals", "quotaWarnPercent"],
            )}
            {numField(
              "Quota critical (%)",
              dp.signals.quotaCriticalPercent,
              (value) => setDataplaneSignals({ quotaCriticalPercent: value }),
              `Default: ${signalDefaults.quotaCriticalPercent}`,
              "Quota usage percent that marks quota pressure as critical. Must be greater than warn.",
              ["signals", "quotaCriticalPercent"],
            )}
          </Box>
          <Divider />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              {sectionTitle(
                "Signal Catalog",
                "Global overrides apply everywhere. This context overrides inherit from global values and only affect the active Kubernetes context.",
              )}
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <TextField
                  select
                  size="small"
                  label="Scope"
                  value={dataplaneEditScope}
                  disabled
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="global">Global defaults</MenuItem>
                  <MenuItem value="context">This context</MenuItem>
                </TextField>
                <Tooltip title={`Reset ${dataplaneEditScope === "global" ? "global" : "context"} overrides`}>
                  <IconButton size="small" onClick={() => resetSignalOverrides(dataplaneEditScope)} aria-label="Reset signal overrides">
                    <RestartAltIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <TextField
              size="small"
              label="Filter signals"
              value={signalCatalogQuery}
              onChange={(e) => setSignalCatalogQuery(e.target.value)}
              helperText={dataplaneEditScope === "context" && activeContext ? `Editing local overrides for ${activeContext}.` : "Editing global signal defaults."}
            />
            {signalCatalogError ? <Alert severity="warning">{signalCatalogError}</Alert> : null}
            {filteredSignalCatalog.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No signal definitions match the current filter.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {filteredSignalCatalog.map((item) => {
                  const globalOverride = dp.signals.overrides[item.type] || {};
                  const contextOverride = activeContextSignalOverrides[item.type] || {};
                  const override = dataplaneEditScope === "global"
                    ? globalOverride
                    : contextOverride;
                  const inheritedEnabled = dataplaneEditScope === "context"
                    ? (globalOverride.enabled ?? item.defaultEnabled)
                    : item.defaultEnabled;
                  const inheritedSeverity = dataplaneEditScope === "context"
                    ? (globalOverride.severity || item.defaultSeverity || "low")
                    : (item.defaultSeverity || "low");
                  const effectiveSeverity = contextOverride.severity || globalOverride.severity || item.defaultSeverity;
                  const enabledChecked = override.enabled ?? inheritedEnabled;
                  const severityValue = override.severity || "inherit";
                  const changed = Object.keys(override).length > 0;
                  return (
                    <Paper key={item.type} variant="outlined" sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Typography variant="subtitle2">{item.label}</Typography>
                            <Chip size="small" variant="outlined" label={item.type} />
                            {changed ? <Chip size="small" color="info" label="custom" /> : null}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {item.likelyCause || item.calculatedData || "Backend-defined dataplane signal."}
                          </Typography>
                          {item.suggestedAction ? (
                            <Typography variant="caption" color="text.secondary">
                              {item.suggestedAction}
                            </Typography>
                          ) : null}
                        </Box>
                        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                          <ScopedCountChip
                            size="small"
                            color={severityColor(item.defaultSeverity)}
                            label="Default"
                            count={formatChipLabel(item.defaultSeverity || "dynamic")}
                          />
                          <ScopedCountChip
                            size="small"
                            color={severityColor(effectiveSeverity)}
                            label="Effective"
                            count={formatChipLabel(effectiveSeverity || "dynamic")}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={enabledChecked}
                                onChange={(e) => setSignalOverride(item.type, dataplaneEditScope, { enabled: e.target.checked })}
                              />
                            }
                            label="Enabled"
                          />
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minHeight: 24 }}>
                            <Typography variant="caption" color="text.secondary">
                              {override.enabled === undefined ? `Inherits ${inheritedEnabled ? "enabled" : "disabled"}` : "Overrides inherited state"}
                            </Typography>
                            {override.enabled !== undefined ? (
                              <Button size="small" onClick={() => setSignalOverride(item.type, dataplaneEditScope, { enabled: undefined })}>
                                Inherit
                              </Button>
                            ) : null}
                          </Box>
                        </Box>
                        <TextField
                          select
                          size="small"
                          label="Severity"
                          value={severityValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSignalOverride(item.type, dataplaneEditScope, {
                              severity: value === "inherit" ? undefined : value as SignalOverride["severity"],
                            });
                          }}
                          helperText={severityValue === "inherit" ? `Inherits ${inheritedSeverity}` : "Forces emitted severity for this signal."}
                        >
                          <MenuItem value="inherit">Inherit</MenuItem>
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                        </TextField>
                        <TextField
                          size="small"
                          type="number"
                          label="Display priority"
                          value={override.priority ?? ""}
                          onChange={(e) => setSignalOverride(item.type, dataplaneEditScope, {
                            priority: e.target.value === "" ? undefined : Math.round(Number(e.target.value) || 0),
                          })}
                          helperText={`Inherits ${dataplaneEditScope === "context" ? (globalOverride.priority ?? item.defaultPriority) : item.defaultPriority}`}
                        />
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Tooltip title="Reset signal override">
                            <span>
                              <IconButton
                                size="small"
                                disabled={!changed}
                                onClick={() => resetSignalOverride(item.type, dataplaneEditScope)}
                                aria-label={`Reset ${item.type} signal override`}
                              >
                                <RestartAltIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        </Paper>
        ) : null}

        {dataplaneTab === "cache" ? (
        <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
          {sectionTitle(
            "Snapshot TTLs",
            "TTL values control how long cached list snapshots are treated as fresh before dataplane schedules a live refresh. They do not override manual refresh when bypass is enabled.",
          )}
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            {dataplaneTTLResourceKeys.map((key) => (
              <Box key={key} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <TextField
                  size="small"
                  type="number"
                  label={`${getResourceLabel(key as ListResourceKey)} TTL`}
                  value={dp.snapshots.ttlSec[key]}
                  onChange={(e) =>
                    setDataplaneSnapshots({
                      ttlSec: {
                        ...dp.snapshots.ttlSec,
                        [key]: Math.round(Number(e.target.value) || 0),
                      },
                    })
                  }
                  helperText="seconds"
                />
                {fieldOverrideMeta(["snapshots", "ttlSec", key])}
              </Box>
            ))}
          </Box>
        </Paper>
        ) : null}
      </Box>
    );
  };

  const renderImportExport = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Typography variant="h6">Import / Export</Typography>
      <Paper variant="outlined" sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          This exports user settings only. Active context, namespace history, favourites, and theme are not included.
        </Typography>
        <Box sx={actionRowSx}>
          <Button
            variant="contained"
            onClick={() => {
              const blob = new Blob([exportUserSettingsJSON(settings)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "kview-user-settings.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export JSON
          </Button>
          <Button
            color="warning"
            onClick={() => {
              if (!window.confirm("Reset settings to defaults? This will overwrite the current settings profile.")) return;
              resetSettings();
            }}
          >
            Reset to defaults
          </Button>
        </Box>
        <Divider />
        <Button variant="outlined" component="label" sx={{ alignSelf: "flex-start" }}>
          Upload JSON file
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              void importSettingsFile(file);
              e.target.value = "";
            }}
          />
        </Button>
        <TextField
          label="Import settings JSON"
          multiline
          minRows={10}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          fullWidth
        />
        <Box sx={actionRowSx}>
          <Button
            variant="contained"
            onClick={() => {
              importSettingsText(importText);
            }}
            disabled={!importText.trim()}
          >
            Import JSON
          </Button>
          <Button onClick={() => setImportText("")}>Clear</Button>
        </Box>
        {importMessage ? <Alert severity={importMessage.severity}>{importMessage.text}</Alert> : null}
      </Paper>
    </Box>
  );

  return (
    <Box sx={settingsShellSx}>
      <Paper
        variant="outlined"
        sx={{
          width: 240,
          flexShrink: 0,
          borderRadius: 0,
          borderTop: 0,
          borderBottom: 0,
          p: 1.5,
          overflowY: "auto",
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Settings
        </Typography>
        <List dense disablePadding>
          {sections.map((item) => (
            <ListItemButton key={item.id} selected={section === item.id} onClick={() => setSection(item.id)}>
              <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2" }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
      <Box sx={settingsMainSurfaceSx}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, mb: 1.25 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Changes are saved automatically in this browser profile.
            </Typography>
          </Box>
          <Tooltip title="Close settings">
            <IconButton aria-label="Close settings" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {section === "appearance" ? renderAppearance() : null}
        {section === "smartFilters" ? renderSmartFilters() : null}
        {section === "commands" ? renderCustomCommands() : null}
        {section === "actions" ? renderCustomActions() : null}
        {section === "dataplane" ? renderDataplane() : null}
        {section === "importExport" ? renderImportExport() : null}
      </Box>
    </Box>
  );
}
