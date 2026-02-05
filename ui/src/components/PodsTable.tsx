import React, { useEffect, useMemo, useState } from "react";
import { Paper, Typography, Box, Button, TextField } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbarContainer,
} from "@mui/x-data-grid";
import { apiGet } from "../api";
import PodDrawer from "./PodDrawer";

type Pod = {
  name: string;
  namespace: string;
  node?: string;
  phase: string;
  ready: string;
  restarts: number;
  ageSec: number;
};

type Row = Pod & { id: string };

const cols: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1, minWidth: 240 },
  { field: "phase", headerName: "Phase", width: 130 },
  { field: "ready", headerName: "Ready", width: 110 },
  { field: "restarts", headerName: "Restarts", width: 120, type: "number" },
  { field: "node", headerName: "Node", flex: 1, minWidth: 180 },
  {
    field: "ageSec",
    headerName: "Age",
    width: 130,
    type: "number",
    valueFormatter: (p) => formatAge(Number(p.value)),
  },
];

function formatAge(sec: number): string {
  if (!sec || sec < 0) return "-";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PodsToolbar(props: {
  filter: string;
  setFilter: (v: string) => void;
  onOpenSelected: () => void;
  hasSelection: boolean;
}) {
  return (
    <GridToolbarContainer sx={{ display: "flex", gap: 1, p: 1 }}>
      <TextField
        size="small"
        label="Filter (name/node/phase)"
        value={props.filter}
        onChange={(e) => props.setFilter(e.target.value)}
        sx={{ minWidth: 340 }}
      />
      <Box sx={{ flexGrow: 1 }} />
      <Button
        variant="contained"
        onClick={props.onOpenSelected}
        disabled={!props.hasSelection}
      >
        Open
      </Button>
    </GridToolbarContainer>
  );
}

export default function PodsTable({ token, namespace }: { token: string; namespace: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const selectedPodName = useMemo(() => {
    if (!selectionModel.length) return null;
    const id = String(selectionModel[0]); // `${ns}/${name}`
    const parts = id.split("/");
    return parts.length >= 2 ? parts.slice(1).join("/") : null;
  }, [selectionModel]);

  const [drawerPod, setDrawerPod] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    if (!namespace) return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await apiGet<any>(`/api/namespaces/${encodeURIComponent(namespace)}/pods`, token);
        const items: Pod[] = res.items || [];
        const mapped: Row[] = items.map((p) => ({ ...p, id: `${p.namespace}/${p.name}` }));
        setRows(mapped);
        setSelectionModel([]);
      } catch (e: any) {
        setRows([]);
        setSelectionModel([]);
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, namespace]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        (r.node || "").toLowerCase().includes(q) ||
        (r.phase || "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter]);

  function openSelected() {
    if (!selectedPodName) return;
    setDrawerPod(selectedPodName);
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Pods — {namespace}
      </Typography>

      {err ? (
        <Typography color="error" sx={{ whiteSpace: "pre-wrap" }}>
          {err}
        </Typography>
      ) : (
        <div style={{ height: 700, width: "100%" }}>
          <DataGrid
            rows={filteredRows}
            columns={cols}
            density="compact"
            loading={loading}
            disableMultipleRowSelection
            hideFooterSelectedRowCount
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(m) => setSelectionModel(m)}
            onRowDoubleClick={(p) => setDrawerPod((p.row as any).name as string)}
            initialState={{
              sorting: { sortModel: [{ field: "name", sort: "asc" }] },
            }}
            slots={{ toolbar: PodsToolbar }}
            slotProps={{
              toolbar: {
                filter,
                setFilter,
                onOpenSelected: openSelected,
                hasSelection: !!selectedPodName,
              } as any,
            }}
          />
        </div>
      )}

      <PodDrawer
        open={!!drawerPod}
        onClose={() => setDrawerPod(null)}
        token={token}
        namespace={namespace}
        podName={drawerPod}
      />
    </Paper>
  );
}

