import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import type { DataplaneListMeta } from "../../types/api";
import { dataplaneCoarseStateChipColor } from "../../utils/k8sUi";

type Props = {
  meta: DataplaneListMeta | null;
  /** Shown before meta line, e.g. namespace list row-projection caption */
  prefix?: React.ReactNode;
};

/** Compact list-level quality line for cached resource lists (shown under the toolbar). */
export default function DataplaneListMetaStrip({ meta, prefix }: Props) {
  if (!meta || (!meta.state && !meta.freshness && !meta.observed)) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1 }}>
      {prefix}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
        {meta.state && (
          <Chip size="small" label={`Sync: ${meta.state}`} color={dataplaneCoarseStateChipColor(meta.state)} />
        )}
        <Typography variant="caption" color="text.secondary" component="span">
          Updated {meta.freshness ?? "—"} · Scope {meta.coverage ?? "—"} · Issues {meta.degradation ?? "—"} · Detail{" "}
          {meta.completeness ?? "—"}
          {meta.observed ? ` · Checked ${meta.observed}` : ""}
        </Typography>
      </Box>
    </Box>
  );
}
