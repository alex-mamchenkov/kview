import type { DashboardSignalItem } from "../../types/api";
import { fmtTimeAgo } from "../../utils/format";

export function signalSeverityColor(severity?: string): "error" | "warning" | "info" | "default" {
  if (severity === "high" || severity === "error") return "error";
  if (severity === "medium" || severity === "warning") return "warning";
  if (severity === "low" || severity === "info") return "info";
  return "default";
}

export function normalizeSignalText(value?: string): string {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function signalCalculatedText(signal: DashboardSignalItem): string {
  const reason = normalizeSignalText(signal.reason);
  const actual = normalizeSignalText(signal.actualData);
  const calculated = normalizeSignalText(signal.calculatedData);
  if (!calculated || calculated === reason || calculated === actual) return "";
  return calculated;
}

export function signalMetaText(signal: DashboardSignalItem, showMissing = false): string {
  if (!showMissing && !signal.firstSeenAt && !signal.lastSeenAt) return "";
  return `First seen ${signalFirstSeenText(signal)} · Last verified ${signalLastSeenText(signal)}`;
}

export function signalFirstSeenText(signal: DashboardSignalItem): string {
  return signal.firstSeenAt ? fmtTimeAgo(signal.firstSeenAt) : "-";
}

export function signalLastSeenText(signal: DashboardSignalItem): string {
  return signal.lastSeenAt ? fmtTimeAgo(signal.lastSeenAt) : "-";
}

export function signalTooltipText(signal: DashboardSignalItem): string {
  const calculated = signalCalculatedText(signal);
  const parts = [signal.reason];
  if (calculated) parts.push(calculated);
  if (signal.likelyCause) parts.push(`Likely cause: ${signal.likelyCause}`);
  if (signal.suggestedAction) parts.push(`Next step: ${signal.suggestedAction}`);
  parts.push(signalMetaText(signal, true));
  return parts.join(" ");
}
