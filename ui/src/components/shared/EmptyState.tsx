import React from "react";
import { Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type EmptyStateProps = {
  message: string;
  sx?: SxProps<Theme>;
};

export default function EmptyState({ message, sx }: EmptyStateProps) {
  return (
    <Typography variant="body2" sx={sx}>
      {message}
    </Typography>
  );
}
