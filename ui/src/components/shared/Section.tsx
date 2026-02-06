import React from "react";
import { Box, Divider, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type SectionProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  divider?: boolean;
  dividerPlacement?: "title" | "content";
  sx?: SxProps<Theme>;
  headerSx?: SxProps<Theme>;
};

export default function Section({
  title,
  children,
  actions,
  divider = true,
  dividerPlacement = "title",
  sx,
  headerSx,
}: SectionProps) {
  return (
    <Box sx={sx}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, ...headerSx }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {actions ? <Box sx={{ ml: "auto" }}>{actions}</Box> : null}
      </Box>
      {divider && dividerPlacement === "title" ? <Divider /> : null}
      {children}
      {divider && dividerPlacement === "content" ? <Divider /> : null}
    </Box>
  );
}
