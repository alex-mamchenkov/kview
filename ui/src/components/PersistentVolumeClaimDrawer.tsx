import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Drawer,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Divider,
  CircularProgress,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { apiGet } from "../api";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { eventChipColor, pvcPhaseChipColor } from "../utils/k8sUi";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";
import ResourceLinkChip from "./shared/ResourceLinkChip";
import PersistentVolumeDrawer from "./PersistentVolumeDrawer";
import useAccessReview from "../utils/useAccessReview";
import { listResourceAccess } from "../utils/k8sResources";

type PersistentVolumeClaimDetails = {
  summary: PersistentVolumeClaimSummary;
  spec: PersistentVolumeClaimSpec;
  status: PersistentVolumeClaimStatus;
  metadata: PersistentVolumeClaimMetadata;
  yaml: string;
};

type PersistentVolumeClaimSummary = {
  name: string;
  namespace: string;
  phase?: string;
  storageClassName?: string;
  volumeName?: string;
  accessModes?: string[];
  requestedStorage?: string;
  capacity?: string;
  volumeMode?: string;
  ageSec?: number;
  createdAt?: number;
};

type PersistentVolumeClaimSpec = {
  accessModes?: string[];
  volumeMode?: string;
  requests?: { storage?: string };
  selector?: LabelSelector;
  dataSource?: DataSourceRef;
  dataSourceRef?: DataSourceRef;
  finalizers?: string[];
};

type PersistentVolumeClaimStatus = {
  phase?: string;
  capacity?: string;
  conditions?: PersistentVolumeClaimCondition[];
};

type PersistentVolumeClaimCondition = {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: number;
};

type PersistentVolumeClaimMetadata = {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

type LabelSelector = {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorExpression[];
};

type LabelSelectorExpression = {
  key?: string;
  operator?: string;
  values?: string[];
};

type DataSourceRef = {
  kind?: string;
  name?: string;
  apiGroup?: string;
};

type EventDTO = {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
};

function formatAccessModes(modes?: string[]) {
  if (!modes || modes.length === 0) return "-";
  return modes.join(", ");
}

function formatDataSource(ds?: DataSourceRef) {
  if (!ds?.kind && !ds?.name) return "-";
  const base = [ds.kind, ds.name].filter(Boolean).join("/");
  return ds?.apiGroup ? `${base} (${ds.apiGroup})` : base;
}

function formatExpression(expr: LabelSelectorExpression) {
  const values = (expr.values || []).join(", ");
  if (!expr.key && !expr.operator) return "-";
  if (!values) return `${expr.key} ${expr.operator}`.trim();
  return `${expr.key} ${expr.operator} (${values})`.trim();
}

export default function PersistentVolumeClaimDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  persistentVolumeClaimName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PersistentVolumeClaimDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");
  const [drawerPV, setDrawerPV] = useState<string | null>(null);

  const ns = props.namespace;
  const name = props.persistentVolumeClaimName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setDrawerPV(null);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/persistentvolumeclaims/${encodeURIComponent(name)}`,
        props.token
      );
      const item: PersistentVolumeClaimDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/persistentvolumeclaims/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token]);

  const summary = details?.summary;
  const spec = details?.spec;
  const metadata = details?.metadata;
  const status = details?.status;
  const volumeName = summary?.volumeName;
  const pvAccess = useAccessReview({
    token: props.token,
    resource: listResourceAccess.persistentvolumes,
    namespace: null,
    verb: "get",
    enabled: !!volumeName,
  });
  const showPvDeniedHint = !!volumeName && pvAccess.allowed === false;

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      {
        label: "Status",
        value: <Chip size="small" label={valueOrDash(summary?.phase)} color={pvcPhaseChipColor(summary?.phase)} />,
      },
      { label: "Storage Class", value: valueOrDash(summary?.storageClassName) },
      { label: "Volume Mode", value: valueOrDash(summary?.volumeMode) },
      { label: "Access Modes", value: formatAccessModes(summary?.accessModes) },
      { label: "Requested", value: valueOrDash(summary?.requestedStorage) },
      { label: "Capacity", value: valueOrDash(summary?.capacity) },
      {
        label: "Bound PV",
        value: volumeName ? (
          <ResourceLinkChip
            label={volumeName}
            onClick={pvAccess.allowed ? () => setDrawerPV(volumeName) : undefined}
            sx={!pvAccess.allowed ? { opacity: 0.6 } : undefined}
          />
        ) : (
          "-"
        ),
        monospace: true,
      },
      { label: "Age", value: fmtAge(summary?.ageSec) },
      { label: "Created", value: summary?.createdAt ? fmtTs(summary.createdAt) : "-" },
    ],
    [summary, volumeName, pvAccess.allowed]
  );

  const selectorLabels = Object.entries(spec?.selector?.matchLabels || {});
  const selectorExpr = spec?.selector?.matchExpressions || [];
  const finalizers = spec?.finalizers || [];
  const conditions = status?.conditions || [];

  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      PaperProps={{
        sx: {
          mt: 8,
          height: "calc(100% - 64px)",
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
        },
      }}
    >
      <Box sx={{ width: 820, p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            PVC: {name || "-"} <Typography component="span" variant="body2">({ns})</Typography>
          </Typography>
          <IconButton onClick={props.onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ my: 1 }} />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : err ? (
          <ErrorState message={err} />
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Overview" />
              <Tab label="Spec" />
              <Tab label="Events" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OVERVIEW */}
              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.5 }}>
                    <KeyValueTable rows={summaryItems} columns={3} />
                    {showPvDeniedHint ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        Access denied: you don't have permission to view PersistentVolumes.
                      </Typography>
                    ) : null}
                  </Box>

                  <Section title="Status">
                    {conditions.length === 0 ? (
                      <EmptyState message="No conditions reported for this PVC." sx={{ mt: 1 }} />
                    ) : (
                      <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Message</TableCell>
                            <TableCell>Last Transition</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {conditions.map((c, idx) => (
                            <TableRow key={`${c.type ?? "cond"}-${idx}`}>
                              <TableCell>{valueOrDash(c.type)}</TableCell>
                              <TableCell>{valueOrDash(c.status)}</TableCell>
                              <TableCell>{valueOrDash(c.reason)}</TableCell>
                              <TableCell sx={{ whiteSpace: "pre-wrap" }}>{valueOrDash(c.message)}</TableCell>
                              <TableCell>{c.lastTransitionTime ? fmtTs(c.lastTransitionTime) : "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Section>

                  <Section title="Metadata">
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Labels
                      </Typography>
                      {Object.entries(metadata?.labels || {}).length === 0 ? (
                        <EmptyState message="No labels." sx={{ mt: 0.5 }} />
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(metadata?.labels || {}).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}=${v}`} />
                          ))}
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Annotations
                      </Typography>
                      {Object.entries(metadata?.annotations || {}).length === 0 ? (
                        <EmptyState message="No annotations." sx={{ mt: 0.5 }} />
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(metadata?.annotations || {}).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}=${v}`} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Section>
                </Box>
              )}

              {/* SPEC */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Section title="Spec Summary">
                    <KeyValueTable
                      columns={3}
                      sx={{ mt: 1 }}
                      rows={[
                        { label: "Access Modes", value: formatAccessModes(spec?.accessModes) },
                        { label: "Volume Mode", value: valueOrDash(spec?.volumeMode) },
                        { label: "Requested Storage", value: valueOrDash(spec?.requests?.storage) },
                        { label: "Capacity", value: valueOrDash(status?.capacity) },
                        { label: "Data Source", value: formatDataSource(spec?.dataSource) },
                        { label: "Data Source Ref", value: formatDataSource(spec?.dataSourceRef) },
                      ]}
                    />
                  </Section>

                  <Section title="Selector">
                    {selectorLabels.length === 0 && selectorExpr.length === 0 ? (
                      <EmptyState message="No selector defined." sx={{ mt: 1 }} />
                    ) : (
                      <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                        {selectorLabels.length > 0 && (
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {selectorLabels.map(([k, v]) => (
                              <Chip key={`${k}=${v}`} size="small" label={`${k}=${v}`} />
                            ))}
                          </Box>
                        )}
                        {selectorExpr.length > 0 && (
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {selectorExpr.map((expr, idx) => (
                              <Chip key={`${expr.key ?? "expr"}-${idx}`} size="small" label={formatExpression(expr)} />
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Section>

                  <Section title="Finalizers">
                    {finalizers.length === 0 ? (
                      <EmptyState message="No finalizers." sx={{ mt: 1 }} />
                    ) : (
                      <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {finalizers.map((f) => (
                          <Chip key={f} size="small" label={f} />
                        ))}
                      </Box>
                    )}
                  </Section>
                </Box>
              )}

              {/* EVENTS */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <EmptyState message="No events found for this PVC." />
                  ) : (
                    events.map((e, idx) => (
                      <Box key={idx} sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.25 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Chip size="small" label={e.type || "Unknown"} color={eventChipColor(e.type)} />
                            <Typography variant="subtitle2">
                              {valueOrDash(e.reason)} (x{valueOrDash(e.count)})
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {fmtTs(e.lastSeen)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                          {valueOrDash(e.message)}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {/* YAML */}
              {tab === 3 && (
                <Box sx={{ border: "1px solid #ddd", borderRadius: 2, overflow: "auto", height: "100%" }}>
                  <SyntaxHighlighter language="yaml" showLineNumbers wrapLongLines>
                    {details?.yaml || ""}
                  </SyntaxHighlighter>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
      <PersistentVolumeDrawer
        open={!!drawerPV}
        onClose={() => setDrawerPV(null)}
        token={props.token}
        persistentVolumeName={drawerPV}
      />
    </Drawer>
  );
}
