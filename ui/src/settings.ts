import type { ListResourceKey } from "./utils/k8sResources";

export type SettingsScopeMode = "all" | "cluster" | "namespace";
export type SettingsResourceScopeMode = "any" | "selected";
export type CustomCommandOutputType = "text" | "keyValue" | "csv" | "code" | "file";
export type CustomCommandSafety = "safe" | "dangerous";

export type SmartFilterRule = {
  id: string;
  enabled: boolean;
  context: string;
  scope: SettingsScopeMode;
  namespace: string;
  resourceScope: SettingsResourceScopeMode;
  resources: ListResourceKey[];
  pattern: string;
  flags: string;
  display: string;
};

export type KviewUserSettingsV1 = {
  v: 1;
  appearance: {
    defaultListRefreshSec: number;
    dashboardRefreshSec: number;
    smartFiltersEnabled: boolean;
    activityPanelInitiallyOpen: boolean;
  };
  smartFilters: {
    minCount: number;
    rules: SmartFilterRule[];
  };
  customCommands: {
    commands: CustomCommandDefinition[];
  };
};

export type SmartFilterMatchContext = {
  contextName: string;
  namespace?: string | null;
  resourceKey?: ListResourceKey | null;
};

export type CustomCommandDefinition = {
  id: string;
  enabled: boolean;
  name: string;
  containerPattern: string;
  workdir: string;
  command: string;
  outputType: CustomCommandOutputType;
  codeLanguage: string;
  fileName: string;
  compress: boolean;
  safety: CustomCommandSafety;
};

export const USER_SETTINGS_KEY = "kview:userSettings:v1";

export const refreshIntervalOptions = [
  { label: "Off", value: 0 },
  { label: "3s", value: 3 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
];

const allowedRegexFlags = new Set(["d", "g", "i", "m", "s", "u", "v", "y"]);
const allowedScopes = new Set<SettingsScopeMode>(["all", "cluster", "namespace"]);
const allowedResourceScopes = new Set<SettingsResourceScopeMode>(["any", "selected"]);
const allowedCommandOutputTypes = new Set<CustomCommandOutputType>(["text", "keyValue", "csv", "code", "file"]);
const allowedCommandSafety = new Set<CustomCommandSafety>(["safe", "dangerous"]);

export function defaultUserSettings(): KviewUserSettingsV1 {
  return {
    v: 1,
    appearance: {
      defaultListRefreshSec: 0,
      dashboardRefreshSec: 10,
      smartFiltersEnabled: true,
      activityPanelInitiallyOpen: true,
    },
    smartFilters: {
      minCount: 3,
      rules: [
        {
          id: "default-environment-prefix",
          enabled: true,
          context: "",
          scope: "all",
          namespace: "",
          resourceScope: "any",
          resources: [],
          pattern: "^(master|release|test|dev).*$",
          flags: "i",
          display: "$1",
        },
        {
          id: "default-ticket-prefix",
          enabled: true,
          context: "",
          scope: "namespace",
          namespace: "",
          resourceScope: "any",
          resources: [],
          pattern: "([a-zA-Z]+-[0-9]+)",
          flags: "",
          display: "$1",
        },
      ],
    },
    customCommands: {
      commands: [
        {
          id: "default-env",
          enabled: true,
          name: "Environment",
          containerPattern: "",
          workdir: "",
          command: "/bin/env",
          outputType: "keyValue",
          codeLanguage: "",
          fileName: "env.txt",
          compress: false,
          safety: "safe",
        },
      ],
    },
  };
}

export function newSmartFilterRule(): SmartFilterRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    context: "",
    scope: "all",
    namespace: "",
    resourceScope: "any",
    resources: [],
    pattern: "",
    flags: "",
    display: "$1",
  };
}

export function sanitizeRegexFlags(input: string): string {
  const out: string[] = [];
  for (const ch of input.trim()) {
    if (!allowedRegexFlags.has(ch) || out.includes(ch)) continue;
    out.push(ch);
  }
  return out.join("");
}

export function newCustomCommandDefinition(): CustomCommandDefinition {
  return {
    id: `command-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    name: "New command",
    containerPattern: "",
    workdir: "",
    command: "",
    outputType: "text",
    codeLanguage: "",
    fileName: "",
    compress: false,
    safety: "safe",
  };
}

function validRefreshSec(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (!refreshIntervalOptions.some((opt) => opt.value === value)) return fallback;
  return value;
}

function validMinCount(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 50) return fallback;
  return rounded;
}

function isListResourceKey(value: unknown): value is ListResourceKey {
  return typeof value === "string" && allListResourceKeys.includes(value as ListResourceKey);
}

function normalizeRule(input: unknown, fallbackId: string): SmartFilterRule | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SmartFilterRule>;
  if (typeof raw.pattern !== "string" || raw.pattern.trim() === "") return null;
  const flags = sanitizeRegexFlags(typeof raw.flags === "string" ? raw.flags : "");
  try {
    new RegExp(raw.pattern, flags);
  } catch {
    return null;
  }

  const scope = allowedScopes.has(raw.scope as SettingsScopeMode) ? (raw.scope as SettingsScopeMode) : "all";
  const resourceScope = allowedResourceScopes.has(raw.resourceScope as SettingsResourceScopeMode)
    ? (raw.resourceScope as SettingsResourceScopeMode)
    : "any";
  const resources = Array.isArray(raw.resources)
    ? Array.from(new Set(raw.resources.filter(isListResourceKey)))
    : [];

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallbackId,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
    context: typeof raw.context === "string" ? raw.context.trim() : "",
    scope,
    namespace: typeof raw.namespace === "string" ? raw.namespace.trim() : "",
    resourceScope,
    resources,
    pattern: raw.pattern,
    flags,
    display: typeof raw.display === "string" && raw.display.trim() ? raw.display : "$1",
  };
}

function normalizeCustomCommand(input: unknown, fallbackId: string): CustomCommandDefinition | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<CustomCommandDefinition>;
  const command = typeof raw.command === "string" ? raw.command.trim() : "";
  if (!command) return null;

  const containerPattern = typeof raw.containerPattern === "string" ? raw.containerPattern.trim() : "";
  if (containerPattern) {
    try {
      new RegExp(containerPattern);
    } catch {
      return null;
    }
  }

  const outputType = allowedCommandOutputTypes.has(raw.outputType as CustomCommandOutputType)
    ? (raw.outputType as CustomCommandOutputType)
    : "text";
  const safety = allowedCommandSafety.has(raw.safety as CustomCommandSafety)
    ? (raw.safety as CustomCommandSafety)
    : "safe";

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallbackId,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
    name:
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : command.length > 40
          ? `${command.slice(0, 37)}...`
          : command,
    containerPattern,
    workdir: typeof raw.workdir === "string" ? raw.workdir.trim() : "",
    command,
    outputType,
    codeLanguage: typeof raw.codeLanguage === "string" ? raw.codeLanguage.trim() : "",
    fileName: typeof raw.fileName === "string" ? raw.fileName.trim() : "",
    compress: typeof raw.compress === "boolean" ? raw.compress : false,
    safety,
  };
}

export function validateUserSettings(input: unknown): KviewUserSettingsV1 | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<KviewUserSettingsV1>;
  if (raw.v !== 1) return null;

  const defaults = defaultUserSettings();
  const rawAppearance = (raw.appearance ?? {}) as Partial<KviewUserSettingsV1["appearance"]>;
  const rawSmartFilters = (raw.smartFilters ?? {}) as Partial<KviewUserSettingsV1["smartFilters"]>;
  const rawCustomCommands = (raw.customCommands ?? {}) as Partial<KviewUserSettingsV1["customCommands"]>;
  const rulesProvided = Array.isArray(rawSmartFilters.rules);
  const rawRules: unknown[] = rulesProvided ? (rawSmartFilters.rules as unknown[]) : [];
  const normalizedRules = rawRules
    .map((rule: unknown, index: number) => normalizeRule(rule, `imported-rule-${index + 1}`))
    .filter((rule): rule is SmartFilterRule => Boolean(rule));
  if (rulesProvided && normalizedRules.length !== rawRules.length) return null;
  const commandsProvided = Array.isArray(rawCustomCommands.commands);
  const rawCommands: unknown[] = commandsProvided ? (rawCustomCommands.commands as unknown[]) : [];
  const normalizedCommands = rawCommands
    .map((cmd: unknown, index: number) => normalizeCustomCommand(cmd, `imported-command-${index + 1}`))
    .filter((cmd): cmd is CustomCommandDefinition => Boolean(cmd));
  if (commandsProvided && normalizedCommands.length !== rawCommands.length) return null;

  return {
    v: 1,
    appearance: {
      defaultListRefreshSec: validRefreshSec(
        rawAppearance.defaultListRefreshSec,
        defaults.appearance.defaultListRefreshSec,
      ),
      dashboardRefreshSec: validRefreshSec(
        rawAppearance.dashboardRefreshSec,
        defaults.appearance.dashboardRefreshSec,
      ),
      smartFiltersEnabled:
        typeof rawAppearance.smartFiltersEnabled === "boolean"
          ? rawAppearance.smartFiltersEnabled
          : defaults.appearance.smartFiltersEnabled,
      activityPanelInitiallyOpen:
        typeof rawAppearance.activityPanelInitiallyOpen === "boolean"
          ? rawAppearance.activityPanelInitiallyOpen
          : defaults.appearance.activityPanelInitiallyOpen,
    },
    smartFilters: {
      minCount: validMinCount(rawSmartFilters.minCount, defaults.smartFilters.minCount),
      rules: rulesProvided ? normalizedRules : defaults.smartFilters.rules,
    },
    customCommands: {
      commands: commandsProvided ? normalizedCommands : defaults.customCommands.commands,
    },
  };
}

export function loadUserSettings(): KviewUserSettingsV1 {
  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_KEY);
    if (!raw) return defaultUserSettings();
    const parsed = JSON.parse(raw);
    return validateUserSettings(parsed) ?? defaultUserSettings();
  } catch {
    return defaultUserSettings();
  }
}

export function saveUserSettings(settings: KviewUserSettingsV1) {
  window.localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
}

export function parseUserSettingsJSON(text: string): KviewUserSettingsV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Settings JSON is not valid.");
  }
  const settings = validateUserSettings(parsed);
  if (!settings) {
    throw new Error("Settings JSON must be a valid kview user settings v1 profile.");
  }
  return settings;
}

export function exportUserSettingsJSON(settings: KviewUserSettingsV1): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}

function ruleMatchesContext(rule: SmartFilterRule, ctx: SmartFilterMatchContext): boolean {
  if (rule.context && rule.context !== ctx.contextName) return false;

  if (rule.scope === "cluster" && ctx.namespace) return false;
  if (rule.scope === "namespace") {
    if (!ctx.namespace) return false;
    if (rule.namespace && rule.namespace !== ctx.namespace) return false;
  }

  if (rule.resourceScope === "selected") {
    if (!ctx.resourceKey) return false;
    if (!rule.resources.includes(ctx.resourceKey)) return false;
  }

  return true;
}

export function labelForSmartFilterRule(
  name: string,
  rule: SmartFilterRule,
  ctx: SmartFilterMatchContext,
): string | null {
  if (!rule.enabled || !rule.pattern || !ruleMatchesContext(rule, ctx)) return null;
  try {
    const re = new RegExp(rule.pattern, rule.flags);
    const match = name.match(re);
    if (!match) return null;
    const label = renderReplacementTemplate(rule.display, match).trim();
    return label || null;
  } catch {
    return null;
  }
}

function renderReplacementTemplate(template: string, match: RegExpMatchArray): string {
  return template.replace(/\$(\$|&|`|'|\d{1,2})/g, (raw, token: string) => {
    if (token === "$") return "$";
    if (token === "&") return match[0] ?? "";
    if (token === "`" || token === "'") return "";
    const index = Number(token);
    if (!Number.isInteger(index)) return raw;
    return match[index] ?? "";
  });
}

export function labelForSmartFilterRules(
  name: string,
  rules: SmartFilterRule[],
  ctx: SmartFilterMatchContext,
): string | null {
  for (const rule of rules) {
    const label = labelForSmartFilterRule(name, rule, ctx);
    if (label) return label;
  }
  return null;
}

export function customCommandMatchesContainer(command: CustomCommandDefinition, containerName: string): boolean {
  if (!command.enabled || !command.command.trim()) return false;
  const pattern = command.containerPattern.trim();
  if (!pattern) return true;
  try {
    return new RegExp(pattern).test(containerName);
  } catch {
    return false;
  }
}

export function customCommandsForContainer(
  commands: CustomCommandDefinition[],
  containerName: string,
): CustomCommandDefinition[] {
  return commands.filter((command) => customCommandMatchesContainer(command, containerName));
}

export const allListResourceKeys: ListResourceKey[] = [
  "pods",
  "deployments",
  "daemonsets",
  "statefulsets",
  "replicasets",
  "jobs",
  "cronjobs",
  "services",
  "ingresses",
  "configmaps",
  "secrets",
  "serviceaccounts",
  "roles",
  "rolebindings",
  "clusterroles",
  "clusterrolebindings",
  "persistentvolumeclaims",
  "persistentvolumes",
  "nodes",
  "namespaces",
  "customresourcedefinitions",
  "helm",
  "helmcharts",
];
