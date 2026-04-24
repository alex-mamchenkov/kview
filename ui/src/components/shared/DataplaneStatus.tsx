import React, { useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import { apiGet } from "../../api";
import type { ApiDashboardClusterResponse } from "../../types/api";
import { dataplaneCoarseStateChipColor } from "../../utils/k8sUi";
import ScopedCountChip from "./ScopedCountChip";

type Props = {
  token: string;
};

export default function DataplaneStatus(props: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiDashboardClusterResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const res = await apiGet<ApiDashboardClusterResponse>("/api/dashboard/cluster", props.token);
        if (!cancelled) {
          setData(res);
        }
      } catch (e) {
        if (!cancelled) {
          setErr("Failed to load cluster data status");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.token]);

  if (loading) {
    return (
      <Box sx={{ mb: 1, px: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Loading cluster data…
        </Typography>
      </Box>
    );
  }

  if (err || !data || !data.item) {
    return null;
  }

  const ns = data.item.visibility.namespaces;
  const nodes = data.item.visibility.nodes;
  const plane = data.item.plane;
  const coverage = data.item.coverage;
  const signals = data.item.signals;

  return (
    <Box sx={{ mb: 1, px: 2, display: "flex", flexWrap: "wrap", rowGap: 0.5, columnGap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Cluster data · context {data.active || "-"}
      </Typography>

      {coverage.namespacesInResourceTotals > 0 && (
        <ScopedCountChip
          size="small"
          variant="outlined"
          color={(signals?.high || 0) > 0 ? "warning" : "default"}
          label="Signal scope"
          count={`${coverage.namespacesInResourceTotals}/${coverage.visibleNamespaces} ns · ${signals?.total ?? 0} signals`}
        />
      )}

      <ScopedCountChip size="small" label="Namespaces" count={`${ns.state} · ${ns.freshness} · scope ${ns.coverage}`} color={dataplaneCoarseStateChipColor(ns.state)} />
      <ScopedCountChip size="small" label="Nodes" count={`${nodes.state} · ${nodes.freshness} · scope ${nodes.coverage}`} color={dataplaneCoarseStateChipColor(nodes.state)} />
      <ScopedCountChip size="small" variant="outlined" label="Namespace list" count={ns.observerState || "—"} />
      <ScopedCountChip size="small" variant="outlined" label="Node list" count={nodes.observerState || "—"} />
      <ScopedCountChip size="small" variant="outlined" label="Profile" count={plane.profile || "unknown"} />
      <ScopedCountChip size="small" variant="outlined" label="Discovery" count={plane.discoveryMode || "unknown"} />
      <ScopedCountChip size="small" variant="outlined" label="Activation" count={plane.activationMode || "unknown"} />
      <ScopedCountChip size="small" variant="outlined" label="Scope" count={`${plane.scope.namespaces} / ${plane.scope.resourceKinds}`} />
    </Box>
  );
}
