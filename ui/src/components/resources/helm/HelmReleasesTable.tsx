import React, { useCallback } from "react";
import { Chip } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { apiGetWithContext } from "../../../api";
import { fmtTs, valueOrDash } from "../../../utils/format";
import { helmStatusChipColor, listSignalLabel, listSignalSeverityColor } from "../../../utils/k8sUi";
import HelmReleaseDrawer from "./HelmReleaseDrawer";
import { HelmInstallButton } from "./HelmActions";
import { getResourceLabel, listResourceAccess } from "../../../utils/k8sResources";
import ResourceListPage from "../../shared/ResourceListPage";
import {
  dataplaneListMetaFromResponse,
  type ApiDataplaneListResponse,
} from "../../../types/api";
import { dataplaneRevisionFetcher, defaultRevisionPollSec } from "../../../utils/dataplaneRevisionPoll";

type HelmRelease = {
  name: string;
  namespace: string;
  status: string;
  revision: number;
  chart: string;
  chartName: string;
  chartVersion: string;
  appVersion: string;
  description: string;
  updated: number;
  storageBackend: string;
  stabilityBucket?: string;
  transitional?: boolean;
  listStatus?: string;
  listSignalSeverity?: string;
  listSignalCount?: number;
};

type Row = HelmRelease & { id: string };

const resourceLabel = getResourceLabel("helm");

const columns: GridColDef<Row>[] = [
  { field: "name", headerName: "Name", flex: 1, minWidth: 200 },
  {
    field: "listSignalSeverity",
    headerName: "Signal",
    width: 140,
    renderCell: (p) => {
      const severity = p.row.listSignalSeverity;
      return <Chip size="small" label={listSignalLabel(severity, p.row.listSignalCount)} color={listSignalSeverityColor(severity)} />;
    },
    sortable: false,
  },
  {
    field: "listStatus",
    headerName: "Status",
    width: 140,
    renderCell: (p) => (
      <Chip
        size="small"
        label={valueOrDash((p.row.listStatus || p.row.status) as string | undefined)}
        color={helmStatusChipColor((p.row.listStatus || p.row.status) as string | undefined)}
      />
    ),
  },
  {
    field: "revision",
    headerName: "Revision",
    width: 90,
    type: "number",
    renderCell: (p) => valueOrDash(p.value as number | undefined),
  },
  {
    field: "chart",
    headerName: "Chart",
    width: 220,
    renderCell: (p) => valueOrDash(p.value as string | undefined),
  },
  {
    field: "appVersion",
    headerName: "App Version",
    width: 130,
    renderCell: (p) => valueOrDash(p.value as string | undefined),
  },
  {
    field: "updated",
    headerName: "Updated",
    width: 180,
    renderCell: (p) => fmtTs(p.value as number | undefined),
  },
];

export default function HelmReleasesTable({
  token,
  namespace,
}: {
  token: string;
  namespace: string;
}) {
  const fetchRows = useCallback(async (contextName?: string) => {
    const res = await apiGetWithContext<ApiDataplaneListResponse<HelmRelease>>(
      `/api/namespaces/${encodeURIComponent(namespace)}/helmreleases`,
      token,
      contextName || "",
    );
    const items = res.items || [];
    return {
      rows: items.map((r) => ({ ...r, id: `${r.namespace}/${r.name}` })),
      dataplaneMeta: dataplaneListMetaFromResponse({ meta: res.meta, observed: res.observed }),
    };
  }, [token, namespace]);

  const filterPredicate = useCallback(
    (row: Row, q: string) =>
      row.name.toLowerCase().includes(q) ||
      row.chart.toLowerCase().includes(q) ||
      (row.listSignalSeverity || "").toLowerCase().includes(q) ||
      (row.transitional ? "transitional" : "").includes(q) ||
      (row.appVersion || "").toLowerCase().includes(q),
    [],
  );

  return (
    <ResourceListPage<Row>
      token={token}
      title={<>{resourceLabel} — {namespace}</>}
      columns={columns}
      fetchRows={fetchRows}
      dataplaneRevisionPoll={{
        fetchRevision: dataplaneRevisionFetcher(token, "helmreleases", namespace),
        pollSec: defaultRevisionPollSec,
      }}
      enabled={!!namespace}
      filterPredicate={filterPredicate}
      filterLabel="Filter (name / chart / signal / version)"
      resourceLabel={resourceLabel}
      resourceKey="helm"
      accessResource={listResourceAccess.helm}
      namespace={namespace}
      renderFooterExtra={(refetch) => (
        <HelmInstallButton
          token={token}
          namespace={namespace}
          onSuccess={() => void refetch()}
        />
      )}
      renderDrawer={({ selectedId, open, onClose, refetch }) => {
        const releaseName = selectedId ? selectedId.split("/").slice(1).join("/") : null;
        return (
          <HelmReleaseDrawer
            open={open}
            onClose={onClose}
            token={token}
            namespace={namespace}
            releaseName={releaseName}
            onRefresh={() => void refetch()}
          />
        );
      }}
    />
  );
}
