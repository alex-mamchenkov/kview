import React from "react";
import { Chip, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ChipColor } from "../../utils/k8sUi";

type ResourceLinkChipProps = {
  label: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  sx?: SxProps<Theme>;
  color?: ChipColor | "primary";
  title?: string;
};

export default function ResourceLinkChip({ label, onClick, sx, color, title }: ResourceLinkChipProps) {
  const clickable = !!onClick;
  const chip = (
    <Chip
      size="small"
      variant={clickable ? "outlined" : "filled"}
      color={color || (clickable ? "primary" : "default")}
      label={label}
      onClick={onClick}
      clickable={clickable}
      sx={{ textTransform: "none", ...sx }}
    />
  );
  if (!title) return chip;
  return (
    <Tooltip title={title} arrow>
      {chip}
    </Tooltip>
  );
}
