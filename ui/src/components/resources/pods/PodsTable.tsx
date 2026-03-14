import React, { useCallback } from "react";
import { Chip } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { apiGet } from "../../../api";
import PodDrawer from "./PodDrawer";
import { fmtAge } from "../../../utils/format";
import { eventChipColor, phaseChipColor } from "../../../utils/k8sUi";
import { getResourceLabel, listResourceAccess } from "../../../utils/k8sResources";
import ResourceListPage from "../../shared/ResourceListPage";

type Pod = {
  name: string;
  namespace: string;
  node?: string;
  phase: string;
  ready: string;
  restarts: number;
  ageSec: number;
  lastEvent?: {
    type: string;
    reason: string;
    lastSeen: number;
  };
};

type Row = Pod & { id: string };

const resourceLabel = getResourceLabel("pods");

const columns: GridColDef<Row>[] = [
  { field: "name", headerName: "Name", flex: 1, minWidth: 240 },
  {
    field: "phase",
    headerName: "Phase",
    width: 130,
    renderCell: (p) => {
      const phase = String(p.value || "");
      return <Chip size="small" label={phase || "-"} color={phaseChipColor(phase)} />;
    },
  },
  { field: "ready", headerName: "Ready", width: 110 },
  { field: "restarts", headerName: "Restarts", width: 120, type: "number" },
  { field: "node", headerName: "Node", flex: 1, minWidth: 180 },
  {
    field: "lastEvent",
    headerName: "Last Event",
    width: 200,
    renderCell: (p) => {
      const ev = p.row.lastEvent;
      if (!ev?.reason) return "-";
      return <Chip size="small" label={ev.reason} color={eventChipColor(ev.type)} />;
    },
    sortable: false,
  },
  {
    field: "ageSec",
    headerName: "Age",
    width: 130,
    type: "number",
    renderCell: (p) => fmtAge(Number(p.row?.ageSec), "table"),
  },
];

export default function PodsTable({ token, namespace }: { token: string; namespace: string }) {
  const fetchRows = useCallback(async (): Promise<Row[]> => {
    const res = await apiGet<{ items: Pod[] }>(
      `/api/namespaces/${encodeURIComponent(namespace)}/pods`,
      token,
    );
    const items = res.items || [];
    return items.map((p) => ({ ...p, id: `${p.namespace}/${p.name}` }));
  }, [token, namespace]);

  const filterPredicate = useCallback((row: Row, q: string) => {
    return (
      row.name.toLowerCase().includes(q) ||
      (row.node || "").toLowerCase().includes(q) ||
      (row.phase || "").toLowerCase().includes(q)
    );
  }, []);

  return (
    <ResourceListPage<Row>
      token={token}
      title={<>{resourceLabel} — {namespace}</>}
      columns={columns}
      fetchRows={fetchRows}
      enabled={!!namespace}
      filterPredicate={filterPredicate}
      filterLabel="Filter (name/node/phase)"
      resourceLabel={resourceLabel}
      accessResource={listResourceAccess.pods}
      namespace={namespace}
      renderDrawer={({ selectedId, open, onClose }) => {
        const podName = selectedId ? selectedId.split("/").slice(1).join("/") : null;
        return (
          <PodDrawer
            open={open}
            onClose={onClose}
            token={token}
            namespace={namespace}
            podName={podName}
          />
        );
      }}
    />
  );
}
