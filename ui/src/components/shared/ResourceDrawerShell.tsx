import React from "react";
import { Box, Typography, IconButton, Divider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  RESOURCE_DRAWER_WIDTH,
  RESOURCE_DRAWER_PADDING,
  RESOURCE_DRAWER_HEADER_DIVIDER_MY,
} from "../../constants/drawerTokens";

export type ResourceDrawerShellProps = {
  /** Header title (e.g. "Pod: my-pod" or a fragment with chips). */
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Content width in px. Defaults to RESOURCE_DRAWER_WIDTH (820).
   * Use RESOURCE_DRAWER_WIDTH_NARROW (620) for simpler/narrow drawers.
   */
  contentWidth?: number;
};

/**
 * Shared layout shell for resource detail drawers: outer container, header row, divider, and content slot.
 * Use inside RightDrawer so all resource drawers share the same width, padding, and header pattern.
 */
export default function ResourceDrawerShell({
  title,
  onClose,
  children,
  contentWidth = RESOURCE_DRAWER_WIDTH,
}: ResourceDrawerShellProps) {
  return (
    <Box
      sx={{
        width: contentWidth,
        p: RESOURCE_DRAWER_PADDING,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ my: RESOURCE_DRAWER_HEADER_DIVIDER_MY }} />

      {children}
    </Box>
  );
}
