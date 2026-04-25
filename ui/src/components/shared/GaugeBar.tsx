import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { GAUGE_BORDER_RADIUS, GAUGE_HEIGHT, GAUGE_TRACK_BG } from "../../theme/sxTokens";

export type GaugeTone = "success" | "warning" | "error" | "info" | "primary" | "default";

function gaugeColor(tone: GaugeTone): string {
  switch (tone) {
    case "success":
      return "var(--gauge-success-fill)";
    case "warning":
      return "var(--gauge-warning-fill)";
    case "error":
      return "var(--gauge-error-fill)";
    case "info":
      return "var(--gauge-info-fill)";
    case "primary":
      return "var(--gauge-primary-fill)";
    default:
      return "var(--gauge-default-fill)";
  }
}

function labelColorOnFill(tone: GaugeTone): string {
  return tone === "warning" ? "var(--gauge-warning-label-on-fill)" : "var(--gauge-label-on-fill)";
}

export default function GaugeBar({
  value,
  tone = "success",
  label,
  height = GAUGE_HEIGHT,
}: {
  value: number;
  tone?: GaugeTone;
  label?: React.ReactNode;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const color = gaugeColor(tone);

  return (
    <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
      <LinearProgress
        variant="determinate"
        value={clamped}
        sx={{
          width: "100%",
          height,
          borderRadius: GAUGE_BORDER_RADIUS,
          border: "1px solid var(--gauge-track-border)",
          backgroundColor: GAUGE_TRACK_BG,
          "& .MuiLinearProgress-bar": {
            backgroundColor: color,
            borderRadius: GAUGE_BORDER_RADIUS,
          },
        }}
      />
      {label != null ? (
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            width: "100%",
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: clamped >= 50 ? labelColorOnFill(tone) : "text.primary",
            lineHeight: `${height}px`,
          }}
        >
          {label}
        </Typography>
      ) : null}
    </Box>
  );
}
