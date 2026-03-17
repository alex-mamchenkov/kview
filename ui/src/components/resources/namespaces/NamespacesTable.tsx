import React, { useCallback, useMemo, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { apiGet } from "../../../api";
import type { ApiNamespacesListResponse } from "../../../types/api";
import NamespaceDrawer from "./NamespaceDrawer";
import { fmtAge } from "../../../utils/format";
import { namespacePhaseChipColor } from "../../../utils/k8sUi";
import { getResourceLabel, listResourceAccess } from "../../../utils/k8sResources";
import ResourceListPage from "../../shared/ResourceListPage";

type Namespace = {
  name: string;
  phase: string;
  ageSec: number;
  hasUnhealthyConditions: boolean;
};

type Row = Namespace & { id: string };

const resourceLabel = getResourceLabel("namespaces");

const columns: GridColDef<Row>[] = [
  { field: "name", headerName: "Name", flex: 1, minWidth: 220 },
  {
    field: "phase",
    headerName: "Phase",
    width: 180,
    renderCell: (p) => {
      const phase = String(p.value || "");
      const row = p.row;
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Chip size="small" label={phase || "-"} color={namespacePhaseChipColor(phase)} />
          {row.hasUnhealthyConditions && (
            <Chip size="small" color="error" label="Unhealthy" />
          )}
        </Box>
      );
    },
  },
  {
    field: "ageSec",
    headerName: "Age",
    width: 130,
    type: "number",
    renderCell: (p) => fmtAge(Number(p.row?.ageSec), "table"),
  },
];

export default function NamespacesTable({
  token,
  onNavigate,
}: {
  token: string;
  onNavigate?: (section: string, namespace: string) => void;
}) {
  const [listMeta, setListMeta] = useState<ApiNamespacesListResponse["meta"] | null>(null);

  const fetchRows = useCallback(async (): Promise<Row[]> => {
    const res = await apiGet<ApiNamespacesListResponse>("/api/namespaces", token);
    setListMeta(res.meta ?? null);
    const items = res.items || [];
    return items.map((n) => ({ ...n, id: n.name }));
  }, [token]);

  const filterPredicate = useCallback(
    (row: Row, q: string) =>
      row.name.toLowerCase().includes(q) || (row.phase || "").toLowerCase().includes(q),
    [],
  );

  const title = useMemo(
    () => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <span>{resourceLabel}</span>
        {listMeta && (
          <>
            <Chip
              size="small"
              label={`State: ${listMeta.state || "unknown"}`}
              color={listMeta.state === "ok" ? "success" : listMeta.state === "empty" ? "default" : "warning"}
            />
            <Typography variant="caption" color="text.secondary">
              Freshness {listMeta.freshness || "unknown"} · Coverage {listMeta.coverage || "unknown"} · Degradation{" "}
              {listMeta.degradation || "unknown"}
            </Typography>
          </>
        )}
      </Box>
    ),
    [listMeta]
  );

  return (
    <ResourceListPage<Row>
      token={token}
      title={title}
      columns={columns}
      fetchRows={fetchRows}
      filterPredicate={filterPredicate}
      filterLabel="Filter (name/phase)"
      resourceLabel={resourceLabel}
      accessResource={listResourceAccess.namespaces}
      namespace={null}
      renderDrawer={({ selectedId, open, onClose }) => (
        <NamespaceDrawer
          open={open}
          onClose={onClose}
          token={token}
          namespaceName={selectedId}
          onNavigate={onNavigate}
        />
      )}
    />
  );
}
