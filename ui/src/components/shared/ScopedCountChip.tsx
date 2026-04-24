import React from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import type { ChipProps } from "@mui/material/Chip";
import type { SxProps, Theme } from "@mui/material/styles";

type ScopedCountChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info";

type ScopedCountChipSize = NonNullable<ChipProps["size"]>;
type ScopedCountChipDensity = "default" | "compact";

export type ScopedCountChipProps = {
  label: string;
  count: React.ReactNode;
  color?: ScopedCountChipColor;
  size?: ChipProps["size"];
  density?: ScopedCountChipDensity;
  variant?: ChipProps["variant"];
  onClick?: ChipProps["onClick"];
  clickable?: boolean;
  sx?: SxProps<Theme>;
  title?: string;
};

export function scopedCountToneVars(color: ScopedCountChipColor) {
  const tone = color || "default";
  return {
    "--scoped-chip-bg": `var(--chip-${tone}-bg)`,
    "--scoped-chip-fg": `var(--chip-${tone}-fg)`,
    "--scoped-chip-border": `var(--chip-${tone}-border)`,
  } as React.CSSProperties;
}

export function ScopedCountContent({
  label,
  count,
  size,
  density = "default",
}: {
  label: string;
  count: React.ReactNode;
  size: ScopedCountChipSize;
  density?: ScopedCountChipDensity;
}) {
  const compact = density === "compact";
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "stretch", minWidth: 0 }}>
      <Box
        component="span"
        sx={{
          backgroundColor: "var(--scoped-chip-bg)",
          color: "var(--scoped-chip-fg)",
          px: compact ? 0.5 : size === "small" ? 0.875 : 1,
          py: compact ? 0.125 : 0.25,
          fontWeight: 600,
          fontSize: compact ? "0.75rem" : undefined,
          lineHeight: compact ? 1.2 : undefined,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          backgroundColor: "var(--chip-scoped-count-bg)",
          color: "var(--chip-scoped-count-fg)",
          borderLeft: "1px solid var(--chip-scoped-count-border)",
          px: compact ? 0.375 : size === "small" ? 0.625 : 0.75,
          py: compact ? 0.125 : 0.25,
          fontWeight: 700,
          fontSize: compact ? "0.75rem" : undefined,
          lineHeight: compact ? 1.2 : undefined,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {count}
      </Box>
    </Box>
  );
}

export function scopedCountChipSx(
  color: ScopedCountChipColor,
  variant: NonNullable<ChipProps["variant"]>,
  density: ScopedCountChipDensity,
  sx?: SxProps<Theme>,
): SxProps<Theme> {
  const compact = density === "compact";
  return {
    ...scopedCountToneVars(color),
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid var(--scoped-chip-border)",
    backgroundColor: variant === "outlined" ? "transparent" : "var(--scoped-chip-bg)",
    color: "var(--scoped-chip-fg)",
    height: compact ? 22 : "auto",
    padding: 0,
    "& .MuiChip-label": {
      display: "flex",
      padding: 0,
      overflow: "hidden",
    },
    ...sx,
  };
}

export default function ScopedCountChip({
  label,
  count,
  color = "default",
  size = "small",
  density = "default",
  variant = "filled",
  onClick,
  clickable,
  sx,
  title,
}: ScopedCountChipProps) {
  const chip = (
    <Chip
      size={size}
      variant={variant}
      label={(
        <ScopedCountContent label={label} count={count} size={size} density={density} />
      )}
      onClick={onClick}
      clickable={clickable ?? !!onClick}
      sx={scopedCountChipSx(color, variant, density, sx)}
    />
  );

  if (!title) return chip;
  return (
    <Tooltip title={title} arrow>
      <span>{chip}</span>
    </Tooltip>
  );
}
