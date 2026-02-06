import React, { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbarContainer,
} from "@mui/x-data-grid";
import { apiGet } from "../api";
import { fmtAge, valueOrDash } from "../utils/format";
import IngressDrawer from "./IngressDrawer";

type Ingress = {
  name: string;
  namespace: string;
  ingressClassName?: string;
  hosts?: string[];
  tlsCount: number;
  addresses?: string[];
  ageSec: number;
};

type Row = Ingress & { id: string };

const cols: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1, minWidth: 240 },
  {
    field: "ingressClassName",
    headerName: "Class",
    width: 160,
    renderCell: (p) => <Chip size="small" label={valueOrDash(String(p.value || ""))} />,
  },
  {
    field: "hosts",
    headerName: "Hosts",
    flex: 1,
    minWidth: 240,
    renderCell: (p) => {
      const hosts = (p.row as any).hosts as string[] | undefined;
      return (
        <Typography variant="body2" noWrap>
          {valueOrDash(hosts?.join(", "))}
        </Typography>
      );
    },
    sortable: false,
  },
  {
    field: "tlsCount",
    headerName: "TLS",
    width: 110,
    renderCell: (p) => {
      const count = Number(p.value || 0);
      const label = count > 0 ? `Yes (${count})` : "No";
      return <Chip size="small" label={label} />;
    },
  },
  {
    field: "addresses",
    headerName: "Address",
    width: 200,
    renderCell: (p) => {
      const addresses = (p.row as any).addresses as string[] | undefined;
      return (
        <Typography variant="body2" noWrap>
          {valueOrDash(addresses?.join(", "))}
        </Typography>
      );
    },
    sortable: false,
  },
  {
    field: "ageSec",
    headerName: "Age",
    width: 130,
    type: "number",
    renderCell: (p) => fmtAge(Number((p.row as any)?.ageSec), "table"),
  },
];

type QuickFilter = { label: string; value: string };

const quickFilterPatterns: Array<{ re: RegExp; label: (m: RegExpMatchArray) => string }> = [
  { re: /^(master|release|test|dev).*$/i, label: (m) => m[1].toLowerCase() },
  { re: /^([^\s-]+-[^\s-]+)-.+$/, label: (m) => m[1] },
];

function buildQuickFilters(rows: Row[]): QuickFilter[] {
  const counts = new Map<string, number>();

  for (const r of rows) {
    const name = r.name || "";
    for (const p of quickFilterPatterns) {
      const m = name.match(p.re);
      if (m) {
        const key = p.label(m);
        if (key) counts.set(key, (counts.get(key) || 0) + 1);
        break;
      }
    }
  }

  return Array.from(counts.entries())
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([k, c]) => ({ label: `${k} (${c})`, value: k }));
}

const refreshOptions = [
  { label: "Off", value: 0 },
  { label: "3s", value: 3 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
];

function IngressesToolbar(props: {
  filter: string;
  setFilter: (v: string) => void;
  selectedQuickFilter: string | null;
  setSelectedQuickFilter: (v: string | null) => void;
  onOpenSelected: () => void;
  hasSelection: boolean;
  refreshSec: number;
  setRefreshSec: (v: number) => void;
  quickFilters: QuickFilter[];
}) {
  function onFilterChange(v: string) {
    props.setFilter(v);
    if (props.selectedQuickFilter && v !== props.selectedQuickFilter) {
      props.setSelectedQuickFilter(null);
    }
  }

  function onQuickFilterClick(value: string) {
    if (props.selectedQuickFilter === value) {
      props.setSelectedQuickFilter(null);
      props.setFilter("");
      return;
    }
    props.setSelectedQuickFilter(value);
    props.setFilter(value);
  }

  return (
    <GridToolbarContainer sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Filter (name/class/host/address)"
          value={props.filter}
          onChange={(e) => onFilterChange(e.target.value)}
          sx={{ minWidth: 340 }}
          InputProps={{
            endAdornment: props.filter ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onFilterChange("")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="refresh-label">Refresh</InputLabel>
          <Select
            labelId="refresh-label"
            label="Refresh"
            value={props.refreshSec}
            onChange={(e) => props.setRefreshSec(Number(e.target.value))}
          >
            {refreshOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={props.onOpenSelected} disabled={!props.hasSelection}>
          Open
        </Button>
      </Box>
      {props.quickFilters.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {props.quickFilters.map((q) => (
            <Button
              key={q.value}
              size="small"
              variant={props.selectedQuickFilter === q.value ? "contained" : "outlined"}
              onClick={() => onQuickFilterClick(q.value)}
            >
              {q.label}
            </Button>
          ))}
        </Box>
      )}
    </GridToolbarContainer>
  );
}

export default function IngressesTable({ token, namespace }: { token: string; namespace: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const selectedName = useMemo(() => {
    if (!selectionModel.length) return null;
    const id = String(selectionModel[0]);
    const parts = id.split("/");
    return parts.length >= 2 ? parts.slice(1).join("/") : null;
  }, [selectionModel]);

  const [drawerName, setDrawerName] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [refreshSec, setRefreshSec] = useState<number>(10);

  useEffect(() => {
    if (!namespace) return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await apiGet<any>(`/api/namespaces/${encodeURIComponent(namespace)}/ingresses`, token);
        const items: Ingress[] = res.items || [];
        const mapped: Row[] = items.map((i) => ({ ...i, id: `${i.namespace}/${i.name}` }));
        setRows(mapped);
        setLastRefresh(new Date());
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

  useEffect(() => {
    if (!namespace || refreshSec <= 0) return;
    const t = setInterval(async () => {
      try {
        const res = await apiGet<any>(`/api/namespaces/${encodeURIComponent(namespace)}/ingresses`, token);
        const items: Ingress[] = res.items || [];
        const mapped: Row[] = items.map((i) => ({ ...i, id: `${i.namespace}/${i.name}` }));
        setRows(mapped);
        setLastRefresh(new Date());
      } catch {
        // keep previous data on refresh error
      }
    }, refreshSec * 1000);
    return () => clearInterval(t);
  }, [token, namespace, refreshSec]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        (r.ingressClassName || "").toLowerCase().includes(q) ||
        (r.hosts || []).join(", ").toLowerCase().includes(q) ||
        (r.addresses || []).join(", ").toLowerCase().includes(q)
      );
    });
  }, [rows, filter]);

  const quickFilters = useMemo(() => buildQuickFilters(rows), [rows]);

  function openSelected() {
    if (!selectedName) return;
    setDrawerName(selectedName);
  }

  const ToolbarAny = IngressesToolbar as any;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Ingresses — {namespace}
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
            onRowDoubleClick={(p) => setDrawerName((p.row as any).name as string)}
            initialState={{
              sorting: { sortModel: [{ field: "name", sort: "asc" }] },
            }}
            slots={{ toolbar: ToolbarAny }}
            slotProps={{
              toolbar: {
                filter,
                setFilter,
                selectedQuickFilter,
                setSelectedQuickFilter,
                onOpenSelected: openSelected,
                hasSelection: !!selectedName,
                refreshSec,
                setRefreshSec,
                quickFilters,
              } as any,
            }}
          />
        </div>
      )}
      <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
        <Typography variant="caption" color="text.secondary">
          Last refresh: {lastRefresh ? lastRefresh.toLocaleString() : "-"}
        </Typography>
      </Box>

      <IngressDrawer
        open={!!drawerName}
        onClose={() => setDrawerName(null)}
        token={token}
        namespace={namespace}
        ingressName={drawerName}
      />
    </Paper>
  );
}
