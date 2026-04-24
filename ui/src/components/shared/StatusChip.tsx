import React from "react";
import { Chip } from "@mui/material";
import type { ChipProps } from "@mui/material/Chip";
import { formatChipLabel } from "../../utils/k8sUi";

type Props = {
  label?: string | number | null;
  color?: ChipProps["color"];
  size?: ChipProps["size"];
  variant?: ChipProps["variant"];
  sx?: ChipProps["sx"];
};

export default function StatusChip({
  label,
  color = "default",
  size = "small",
  variant = "filled",
  sx,
}: Props) {
  return <Chip size={size} color={color} variant={variant} label={formatChipLabel(label)} sx={sx} />;
}
