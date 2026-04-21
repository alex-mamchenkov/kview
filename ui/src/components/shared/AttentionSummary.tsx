import React from "react";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { ChipColor } from "../../utils/k8sUi";
import type { DashboardSignalItem } from "../../types/api";
import Section from "./Section";
import SignalHintIcons from "./SignalHintIcons";

export type AttentionHealth = {
  label: string;
  tone?: ChipColor;
  tooltip?: string;
};

export type AttentionReason = {
  label: string;
  severity?: "error" | "warning" | "info";
  tooltip?: string;
};

export type AttentionSummaryProps = {
  /** Primary health chip (e.g. healthBucket / phase). Omit when there is nothing to show. */
  health?: AttentionHealth;
  /** Attention reasons / structured warnings surfaced by the backend. */
  reasons?: AttentionReason[];
  /** Per-resource signals from the dataplane signal engine. */
  signals?: DashboardSignalItem[];
  /** Optional jump chips for drill-down. Any handler left undefined hides its chip. */
  onJumpToEvents?: () => void;
  onJumpToConditions?: () => void;
  onJumpToSpec?: () => void;
};

function severityColor(severity?: string): "error" | "warning" | "info" | "default" {
  if (severity === "high" || severity === "error") return "error";
  if (severity === "medium" || severity === "warning") return "warning";
  if (severity === "low" || severity === "info") return "info";
  return "default";
}

function worstSignalSeverity(signals: DashboardSignalItem[]): "error" | "warning" | "info" | "default" {
  if (signals.some((s) => s.severity === "high")) return "error";
  if (signals.some((s) => s.severity === "medium")) return "warning";
  if (signals.some((s) => s.severity === "low")) return "info";
  return "default";
}

function signalText(signal: DashboardSignalItem): string {
  const actual = signal.actualData || signal.reason;
  const parts = [actual];
  if (signal.calculatedData && signal.calculatedData !== actual) parts.push(`Calculated: ${signal.calculatedData}`);
  if (signal.likelyCause) parts.push(`Likely cause: ${signal.likelyCause}`);
  if (signal.suggestedAction) parts.push(`Next step: ${signal.suggestedAction}`);
  return parts.join(" · ");
}

function isEmpty(props: AttentionSummaryProps): boolean {
  const { health, reasons, signals } = props;
  if (health && health.label) return false;
  if (reasons && reasons.length > 0) return false;
  if (signals && signals.length > 0) return false;
  return true;
}

/**
 * AttentionSummary renders the top-of-overview state callout for a resource
 * drawer: health chip, backend-provided attention reasons and a top-signal
 * preview, plus jump chips for drill-down into Events / Conditions / Spec.
 *
 * It returns null when the resource has no attention-worthy state so drawers
 * can render it unconditionally at the top of the Overview tab.
 *
 * This component is display-only. It does not derive warnings from raw state;
 * all inputs must come from the backend dataplane signal engine or DTO
 * fields populated by the backend. See docs/UI_UX_GUIDE.md "Signals-first
 * Drawer Content".
 */
export default function AttentionSummary(props: AttentionSummaryProps) {
  if (isEmpty(props)) return null;

  const {
    health,
    reasons = [],
    signals = [],
    onJumpToEvents,
    onJumpToConditions,
    onJumpToSpec,
  } = props;

  const worstSignal = signals.length > 0 ? worstSignalSeverity(signals) : "default";
  const headerColor: ChipColor =
    (health?.tone && health.tone !== "default" && health.tone) ||
    (worstSignal !== "default" ? (worstSignal as ChipColor) : "warning");

  return (
    <Section title="Attention" divider={false} headerSx={{ mb: 0.5 }}>
      <Box
        sx={{
          border: "1px solid var(--chip-warning-border)",
          borderRadius: 2,
          p: 1.25,
          backgroundColor: "var(--chip-warning-bg)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <WarningAmberIcon sx={{ color: "warning.main", fontSize: 20 }} />
          {health?.label ? (
            health.tooltip ? (
              <Tooltip title={health.tooltip}>
                <Chip size="small" color={headerColor} label={health.label} />
              </Tooltip>
            ) : (
              <Chip size="small" color={headerColor} label={health.label} />
            )
          ) : null}
          {signals.length > 0 ? (
            <Chip
              size="small"
              color={worstSignal === "default" ? "warning" : worstSignal}
              label={`Signals: ${signals.length}`}
            />
          ) : null}
        </Box>

        {reasons.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {reasons.map((reason, idx) => {
              const chip = (
                <Chip
                  key={`${reason.label}-${idx}`}
                  size="small"
                  variant="outlined"
                  color={severityColor(reason.severity)}
                  label={reason.label}
                />
              );
              return reason.tooltip ? (
                <Tooltip key={`${reason.label}-${idx}-tip`} title={reason.tooltip}>
                  {chip}
                </Tooltip>
              ) : (
                chip
              );
            })}
          </Box>
        ) : null}

        {signals.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            {signals.slice(0, 3).map((signal, idx) => (
              <Typography
                key={`${signal.signalType || signal.kind}-${signal.name || idx}`}
                variant="body2"
                sx={{ color: "text.primary" }}
              >
                <Chip
                  size="small"
                  color={severityColor(signal.severity)}
                  label={signal.severity || "info"}
                  sx={{ mr: 0.75 }}
                />
                {signalText(signal)}
                <SignalHintIcons
                  likelyCause={signal.likelyCause}
                  suggestedAction={signal.suggestedAction}
                />
              </Typography>
            ))}
            {signals.length > 3 ? (
              <Typography variant="caption" color="text.secondary">
                +{signals.length - 3} more signal{signals.length - 3 === 1 ? "" : "s"}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {(onJumpToEvents || onJumpToConditions || onJumpToSpec) && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {onJumpToConditions ? (
              <Chip size="small" variant="outlined" label="Conditions" onClick={onJumpToConditions} />
            ) : null}
            {onJumpToEvents ? (
              <Chip size="small" variant="outlined" label="Events" onClick={onJumpToEvents} />
            ) : null}
            {onJumpToSpec ? (
              <Chip size="small" variant="outlined" label="Spec" onClick={onJumpToSpec} />
            ) : null}
          </Box>
        )}
      </Box>
    </Section>
  );
}
