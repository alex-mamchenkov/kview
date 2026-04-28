import React from "react";
import { Box, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { DashboardSignalItem } from "../../types/api";
import type { ChipColor } from "../../utils/k8sUi";
import SignalHintIcons from "./SignalHintIcons";
import StatusChip from "./StatusChip";
import { signalCalculatedText, signalMetaText, signalSeverityColor } from "./signalFormat";

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
  /** Deprecated. Ignored; retained to avoid breaking migrated drawers mid-rollout. */
  health?: AttentionHealth;
  /** Deprecated. Ignored; retained to avoid breaking migrated drawers mid-rollout. */
  reasons?: AttentionReason[];
  /** Per-resource signals from the dataplane signal engine. */
  signals?: DashboardSignalItem[];
  /** Deprecated. Kept for backward-compatible callsites; ignored by this component. */
  onJumpToEvents?: () => void;
  /** Deprecated. Kept for backward-compatible callsites; ignored by this component. */
  onJumpToConditions?: () => void;
  /** Deprecated. Kept for backward-compatible callsites; ignored by this component. */
  onJumpToSpec?: () => void;
};

function isEmpty(props: AttentionSummaryProps): boolean {
  const { signals } = props;
  if (signals && signals.length > 0) return false;
  return true;
}

/**
 * AttentionSummary renders the top-of-overview state callout for a resource
 * drawer: top-signal preview.
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

  const { signals = [] } = props;

  return (
    <Box>
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Attention
          </Typography>
        </Box>

        {signals.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {signals.slice(0, 3).map((signal, idx) => {
              const calculated = signalCalculatedText(signal);
              const meta = signalMetaText(signal, true);
              return (
                <Box
                  key={`${signal.signalType || signal.kind}-${signal.name || idx}`}
                  data-signal-row
                  sx={{ color: "text.primary", display: "flex", flexDirection: "column", gap: 0.25 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    <StatusChip size="small" color={signalSeverityColor(signal.severity)} label={signal.severity || "info"} />
                    <Typography component="span" variant="body2">
                      {signal.reason}
                    </Typography>
                    {calculated ? (
                      <Typography component="span" variant="body2" color="text.secondary">
                        {calculated}
                      </Typography>
                    ) : null}
                    <SignalHintIcons likelyCause={signal.likelyCause} suggestedAction={signal.suggestedAction} />
                  </Box>
                  {meta ? (
                    <Typography variant="caption" color="text.secondary">
                      {meta}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
            {signals.length > 3 ? (
              <Typography variant="caption" color="text.secondary">
                +{signals.length - 3} more signal{signals.length - 3 === 1 ? "" : "s"}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
