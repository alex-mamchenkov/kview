import React from "react";
import { Box, Chip, IconButton, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

type Props = {
  state: "inherited" | "overridden";
  onReset?: () => void;
  tooltip?: string;
};

export default function ScopeTag({ state, onReset, tooltip }: Props) {
  if (state === "overridden") {
    const chip = (
      <Chip
        label="custom"
        size="small"
        color="info"
        variant="outlined"
        sx={{ height: 18, fontSize: "0.65rem", "& .MuiChip-label": { px: 0.75 } }}
      />
    );
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
        {tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip}
        {onReset && (
          <Tooltip title="Reset to global">
            <IconButton size="small" onClick={onReset} aria-label="Reset to global" sx={{ p: 0.25 }}>
              <RestartAltIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }
  return null;
}
