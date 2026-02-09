import React from "react";
import { Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import AccessDeniedState from "./AccessDeniedState";

type ErrorStateProps = {
  message: string;
  sx?: SxProps<Theme>;
};

export default function ErrorState({ message, sx }: ErrorStateProps) {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("forbidden") || normalized.includes("unauthorized")) {
    const status = normalized.includes("unauthorized") ? 401 : 403;
    return <AccessDeniedState status={status} sx={sx} />;
  }
  return (
    <Typography color="error" sx={{ whiteSpace: "pre-wrap", ...sx }}>
      {message}
    </Typography>
  );
}
