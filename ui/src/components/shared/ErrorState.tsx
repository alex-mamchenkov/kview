import React from "react";
import { Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type ErrorStateProps = {
  message: string;
  sx?: SxProps<Theme>;
};

export default function ErrorState({ message, sx }: ErrorStateProps) {
  return (
    <Typography color="error" sx={{ whiteSpace: "pre-wrap", ...sx }}>
      {message}
    </Typography>
  );
}
