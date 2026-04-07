import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import CloseIcon from "@mui/icons-material/Close";
import {
  allListResourceKeys,
  exportUserSettingsJSON,
  newCustomCommandDefinition,
  newSmartFilterRule,
  parseUserSettingsJSON,
  refreshIntervalOptions,
  sanitizeRegexFlags,
  type CustomCommandDefinition,
  type CustomCommandOutputType,
  type CustomCommandSafety,
  type KviewUserSettingsV1,
  type SettingsResourceScopeMode,
  type SettingsScopeMode,
  type SmartFilterRule,
} from "../../settings";
import { useUserSettings } from "../../settingsContext";
import { getResourceLabel, type ListResourceKey } from "../../utils/k8sResources";
import { actionRowSx, panelBoxSx } from "../../theme/sxTokens";

type SettingsSection = "appearance" | "smartFilters" | "commands" | "actions" | "nsEnrichment" | "importExport";

type Props = {
  contexts: Array<{ name: string }>;
  namespaces: string[];
  activeContext: string;
  activeNamespace: string;
  onClose: () => void;
};

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "smartFilters", label: "Smart Filters" },
  { id: "commands", label: "Custom Commands" },
  { id: "actions", label: "Custom Actions" },
  { id: "nsEnrichment", label: "NS Enrichment" },
  { id: "importExport", label: "Import / Export" },
];

function updateAppearance(
  settings: KviewUserSettingsV1,
  patch: Partial<KviewUserSettingsV1["appearance"]>,
): KviewUserSettingsV1 {
  return {
    ...settings,
    appearance: { ...settings.appearance, ...patch },
  };
}

function updateSmartFilters(
  settings: KviewUserSettingsV1,
  patch: Partial<KviewUserSettingsV1["smartFilters"]>,
): KviewUserSettingsV1 {
  return {
    ...settings,
    smartFilters: { ...settings.smartFilters, ...patch },
  };
}

function updateCustomCommands(
  settings: KviewUserSettingsV1,
  patch: Partial<KviewUserSettingsV1["customCommands"]>,
): KviewUserSettingsV1 {
  return {
    ...settings,
    customCommands: { ...settings.customCommands, ...patch },
  };
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

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = items.slice();
  const current = next[index];
  next[index] = next[nextIndex];
  next[nextIndex] = current;
  return next;
}

export default function SettingsView({ contexts, namespaces, activeContext, activeNamespace, onClose }: Props) {
  const { settings, setSettings, replaceSettings, resetSettings } = useUserSettings();
  const [section, setSection] = useState<SettingsSection>("appearance");
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);

  const contextOptions = useMemo(
    () => Array.from(new Set([activeContext, ...contexts.map((c) => c.name)].filter(Boolean))),
    [activeContext, contexts],
  );
  const namespaceOptions = useMemo(
    () => Array.from(new Set([activeNamespace, ...namespaces].filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [activeNamespace, namespaces],
  );

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Appearance</Typography>
      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          select
          size="small"
          label="Default list refresh"
          value={settings.appearance.defaultListRefreshSec}
          onChange={(e) =>
            setSettings((prev) =>
              updateAppearance(prev, { defaultListRefreshSec: Number(e.target.value) }),
            )
          }
          helperText="Applies to resource list views. Off keeps dataplane revision polling and background refresh behavior."
          sx={{ maxWidth: 320 }}
        >
          {refreshIntervalOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Dashboard refresh"
          value={settings.appearance.dashboardRefreshSec}
          onChange={(e) =>
            setSettings((prev) =>
              updateAppearance(prev, { dashboardRefreshSec: Number(e.target.value) }),
            )
          }
          helperText="Off loads the dashboard once and disables periodic dashboard polling."
          sx={{ maxWidth: 320 }}
        >
          {refreshIntervalOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
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
    return (
      <Paper key={rule.id} variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Rule {index + 1}
          </Typography>
          <Button size="small" onClick={() => setSettings((prev) => updateSmartFilters(prev, { rules: moveItem(prev.smartFilters.rules, index, -1) }))} disabled={index === 0}>
            Up
          </Button>
          <Button size="small" onClick={() => setSettings((prev) => updateSmartFilters(prev, { rules: moveItem(prev.smartFilters.rules, index, 1) }))} disabled={index === settings.smartFilters.rules.length - 1}>
            Down
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() =>
              setSettings((prev) =>
                updateSmartFilters(prev, { rules: prev.smartFilters.rules.filter((_, i) => i !== index) }),
              )
            }
          >
            Remove
          </Button>
        </Box>
        <FormControlLabel
          control={<Switch checked={rule.enabled} onChange={(e) => setRule(index, { enabled: e.target.checked })} />}
          label="Enabled"
        />
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
            onChange={(e) => setRule(index, { scope: e.target.value as SettingsScopeMode })}
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
              {allListResourceKeys.map((key) => (
                <MenuItem key={key} value={key}>
                  <Checkbox checked={rule.resources.includes(key)} />
                  <ListItemText primary={getResourceLabel(key)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "minmax(260px, 2fr) minmax(120px, 0.6fr) minmax(180px, 1fr)" }}>
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
      <Paper variant="outlined" sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
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
      <Paper key={command.id} variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Command {index + 1}
          </Typography>
          <Button
            size="small"
            onClick={() =>
              setSettings((prev) =>
                updateCustomCommands(prev, {
                  commands: moveItem(prev.customCommands.commands, index, -1),
                }),
              )
            }
            disabled={index === 0}
          >
            Up
          </Button>
          <Button
            size="small"
            onClick={() =>
              setSettings((prev) =>
                updateCustomCommands(prev, {
                  commands: moveItem(prev.customCommands.commands, index, 1),
                }),
              )
            }
            disabled={index === settings.customCommands.commands.length - 1}
          >
            Down
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() =>
              setSettings((prev) =>
                updateCustomCommands(prev, {
                  commands: prev.customCommands.commands.filter((_, i) => i !== index),
                }),
              )
            }
          >
            Remove
          </Button>
        </Box>
        <FormControlLabel
          control={
            <Switch checked={command.enabled} onChange={(e) => setCommand(index, { enabled: e.target.checked })} />
          }
          label="Enabled"
        />
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

  const renderPlaceholder = (title: string, text: string) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">{title}</Typography>
      <Paper variant="outlined" sx={panelBoxSx}>
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      </Paper>
    </Box>
  );

  const renderImportExport = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Import / Export</Typography>
      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
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
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
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
      <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
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
        {section === "actions"
          ? renderPlaceholder("Custom Actions", "Planned for kube action presets.")
          : null}
        {section === "nsEnrichment"
          ? renderPlaceholder(
              "NS Enrichment",
              "Namespace enrichment tuning is currently backend-owned and hardcoded. A later pack will expose the target cap, parallelism, idle quiet window, and related behavior after the browser-local settings model is verified.",
            )
          : null}
        {section === "importExport" ? renderImportExport() : null}
      </Box>
    </Box>
  );
}
