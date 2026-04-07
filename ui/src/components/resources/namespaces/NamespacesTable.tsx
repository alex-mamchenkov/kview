import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { apiGet, apiGetWithContext } from "../../../api";
import {
  type ApiNamespacesEnrichmentPoll,
  type ApiNamespacesListResponse,
  dataplaneListMetaFromResponse,
} from "../../../types/api";
import NamespaceDrawer from "./NamespaceDrawer";
import { fmtAge } from "../../../utils/format";
import { namespacePhaseChipColor, namespaceRowSummaryStateColor } from "../../../utils/k8sUi";
import { getResourceLabel, listResourceAccess } from "../../../utils/k8sResources";
import ResourceListPage from "../../shared/ResourceListPage";
import { dataplaneRevisionFetcher, defaultRevisionPollSec } from "../../../utils/dataplaneRevisionPoll";
import { useActiveContext } from "../../../activeContext";

type Namespace = NonNullable<ApiNamespacesListResponse["items"]>[number];

type Row = Namespace & { id: string };

const resourceLabel = getResourceLabel("namespaces");

/** Poll interval while namespace row details are loading (lighter than per-table list timers). */
const namespaceRowDetailsPollMs = 1500;

function dashNum(row: Row, key: "podCount" | "deploymentCount" | "problematicCount" | "podsWithRestarts"): string {
  if (!row.rowEnriched) return "—";
  const v = row[key];
  if (v === undefined || v === null) return "—";
  return String(v);
}

const columns: GridColDef<Row>[] = [
  { field: "name", headerName: "Name", flex: 1, minWidth: 200 },
  {
    field: "phase",
    headerName: "Status",
    width: 170,
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
    field: "summaryState",
    headerName: "Workload",
    width: 130,
    sortable: false,
    renderCell: (p) => {
      const row = p.row;
      if (!row.rowEnriched || !row.summaryState) {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      return (
        <Chip
          size="small"
          label={row.summaryState}
          color={namespaceRowSummaryStateColor(row.summaryState)}
          variant="outlined"
        />
      );
    },
  },
  {
    field: "podCount",
    headerName: "Pods",
    width: 72,
    align: "right",
    headerAlign: "right",
    sortable: false,
    renderCell: (p) => (
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {dashNum(p.row, "podCount")}
      </Typography>
    ),
  },
  {
    field: "deploymentCount",
    headerName: "Deploy",
    width: 72,
    align: "right",
    headerAlign: "right",
    sortable: false,
    renderCell: (p) => (
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {dashNum(p.row, "deploymentCount")}
      </Typography>
    ),
  },
  {
    field: "problematicCount",
    headerName: "Problems",
    width: 88,
    align: "right",
    headerAlign: "right",
    sortable: false,
    renderCell: (p) => {
      const row = p.row;
      const s = dashNum(row, "problematicCount");
      const n = row.problematicCount ?? 0;
      return (
        <Typography
          variant="body2"
          sx={{ fontVariantNumeric: "tabular-nums", color: row.rowEnriched && n > 0 ? "error.main" : "text.primary" }}
        >
          {s}
        </Typography>
      );
    },
  },
  {
    field: "podsWithRestarts",
    headerName: "Restarts",
    width: 110,
    sortable: false,
    renderCell: (p) => {
      const row = p.row;
      if (!row.rowEnriched) {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {row.podsWithRestarts ?? 0}
          </Typography>
          {row.restartHotspot && <Chip size="small" label="Δ" color="warning" title="Elevated pod restarts (≥5)" />}
        </Box>
      );
    },
  },
  {
    field: "ageSec",
    headerName: "Age",
    width: 100,
    type: "number",
    renderCell: (p) => fmtAge(Number(p.row?.ageSec), "table"),
  },
];

export default function NamespacesTable({
  token,
  listApiPath,
  onNavigate,
}: {
  token: string;
  /** GET path for the namespaces list (optional query hints for prioritized row details). */
  listApiPath: string;
  onNavigate?: (section: string, namespace: string) => void;
}) {
  const [rowProjection, setRowProjection] = useState<ApiNamespacesListResponse["rowProjection"] | null>(null);
  const [enrichRows, setEnrichRows] = useState<ApiNamespacesEnrichmentPoll["updates"] | null>(null);
  const [enrichPoll, setEnrichPoll] = useState<ApiNamespacesEnrichmentPoll | null>(null);
  const activeContext = useActiveContext();

  const fetchRows = useCallback(async (contextName?: string) => {
    // Do not clear enrichRows/enrichPoll here: clearing before the request completes drops merged
    // cells during loading and on every auto-refresh. mapRows only applies poll data when its
    // revision matches rowProjection.revision (after this fetch returns).
    const res = contextName
      ? await apiGetWithContext<ApiNamespacesListResponse>(listApiPath, token, contextName)
      : await apiGet<ApiNamespacesListResponse>(listApiPath, token);
    setRowProjection(res.rowProjection ?? null);
    const items = res.items || [];
    return {
      rows: items.map((n) => ({ ...n, id: n.name })),
      dataplaneMeta: dataplaneListMetaFromResponse({ meta: res.meta, observed: res.observed }),
    };
  }, [token, listApiPath]);

  const mapRows = useCallback(
    (rows: Row[]) => {
      const listRev = rowProjection?.revision ?? 0;
      if (!enrichRows?.length || !listRev) return rows;
      // Ignore stale poll payloads (previous job or pre-first-poll) so we do not flash back to list-only.
      if (enrichPoll == null || enrichPoll.revision !== listRev) return rows;
      const u = new Map(enrichRows.map((n) => [n.name, n]));
      return rows.map((r) => {
        const ex = u.get(r.name);
        return ex ? ({ ...r, ...ex, id: r.name } as Row) : r;
      });
    },
    [enrichRows, enrichPoll, rowProjection?.revision],
  );

  const revision = rowProjection?.revision ?? 0;

  useEffect(() => {
    if (!revision || !token) return;

    let cancelled = false;
    let id = 0;
    const tick = async () => {
      if (cancelled) return;
      try {
        const path = `/api/namespaces/enrichment?revision=${revision}`;
        const res = activeContext
          ? await apiGetWithContext<ApiNamespacesEnrichmentPoll>(path, token, activeContext)
          : await apiGet<ApiNamespacesEnrichmentPoll>(path, token);
        if (cancelled || res.stale) return;
        setEnrichRows(res.updates ?? []);
        setEnrichPoll(res);
        if (res.complete && id) window.clearInterval(id);
      } catch {
        /* ignore transient poll errors */
      }
    };
    void tick();
    id = window.setInterval(tick, namespaceRowDetailsPollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeContext, revision, token]);

  const filterPredicate = useCallback((row: Row, q: string) => {
    const lc = q.toLowerCase();
    const enriched = Boolean(row.rowEnriched);
    return (
      row.name.toLowerCase().includes(lc) ||
      (row.phase || "").toLowerCase().includes(lc) ||
      (row.summaryState || "").toLowerCase().includes(lc) ||
      (enriched && String(row.podCount ?? "").includes(lc)) ||
      (enriched && String(row.deploymentCount ?? "").includes(lc)) ||
      (enriched && String(row.problematicCount ?? "").includes(lc))
    );
  }, []);

  const title = useMemo(() => <span>{resourceLabel}</span>, []);

  const listStatusPrefix = useMemo(() => {
    const total = rowProjection?.totalRows ?? 0;
    if (total <= 0) return null;
    const p = enrichPoll;
    const rawStage = p?.stage ?? rowProjection?.stage ?? "list";
    const d = p?.detailRows ?? 0;
    const r = p?.relatedRows ?? 0;
    const done = p?.complete ?? false;
    const stageHint =
      rawStage === "complete" || done
        ? "Up to date"
        : rawStage === "detail"
          ? "Fetching namespace details"
          : rawStage === "related"
            ? "Loading workload counts"
            : "Preparing";
    const targets = p?.enrichTargets;
    const priorityHint =
      targets != null && targets > 0 ? ` · ${targets} namespace${targets === 1 ? "" : "s"} prioritized` : "";
    return (
      <Typography variant="caption" color="text.secondary" display="block">
        {stageHint}
        {!done ? ` · Details ${d}/${total} · Counts ${r}/${total}` : ""}
        {priorityHint}
        {rowProjection?.note ? ` — ${rowProjection.note}` : ""}
      </Typography>
    );
  }, [rowProjection, enrichPoll]);

  return (
    <ResourceListPage<Row>
      token={token}
      title={title}
      dataplaneMetaPrefix={listStatusPrefix}
      mapRows={mapRows}
      mapRowsDeps={[enrichRows, enrichPoll, rowProjection?.revision]}
      columns={columns}
      fetchRows={fetchRows}
      dataplaneRevisionPoll={{
        fetchRevision: dataplaneRevisionFetcher(token, "namespaces"),
        pollSec: defaultRevisionPollSec,
      }}
      filterPredicate={filterPredicate}
      filterLabel="Filter (name, status, workload state, counts)"
      resourceLabel={resourceLabel}
      resourceKey="namespaces"
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
