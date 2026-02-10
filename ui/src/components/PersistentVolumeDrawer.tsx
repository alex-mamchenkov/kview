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
import { useConnectionState } from "../connectionState";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { eventChipColor, pvPhaseChipColor } from "../utils/k8sUi";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";
import ResourceLinkChip from "./shared/ResourceLinkChip";
import PersistentVolumeClaimDrawer from "./PersistentVolumeClaimDrawer";
import useAccessReview from "../utils/useAccessReview";
import { listResourceAccess } from "../utils/k8sResources";

type PersistentVolumeDetails = {
  summary: PersistentVolumeSummary;
  spec: PersistentVolumeSpec;
  status: PersistentVolumeStatus;
  metadata: PersistentVolumeMetadata;
  yaml: string;
};

type PersistentVolumeSummary = {
  name: string;
  phase?: string;
  capacity?: string;
  accessModes?: string[];
  storageClassName?: string;
  reclaimPolicy?: string;
  volumeMode?: string;
  claimRef?: PersistentVolumeClaimRef;
  ageSec?: number;
  createdAt?: number;
};

type PersistentVolumeSpec = {
  accessModes?: string[];
  volumeMode?: string;
  storageClassName?: string;
  reclaimPolicy?: string;
  mountOptions?: string[];
  volumeSource?: PersistentVolumeSource;
};

type PersistentVolumeSource = {
  type?: string;
  details?: PersistentVolumeSourceDetail[];
};

type PersistentVolumeSourceDetail = {
  label: string;
  value: string;
};

type PersistentVolumeStatus = {
  phase?: string;
  capacity?: string;
  conditions?: PersistentVolumeCondition[];
};

type PersistentVolumeCondition = {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: number;
};

type PersistentVolumeMetadata = {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

type PersistentVolumeClaimRef = {
  namespace?: string;
  name?: string;
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

function formatMountOptions(opts?: string[]) {
  if (!opts || opts.length === 0) return "-";
  return opts.join(", ");
}

function formatClaimRef(ref?: PersistentVolumeClaimRef) {
  if (!ref?.name) return "-";
  if (ref.namespace) return `${ref.namespace}/${ref.name}`;
  return ref.name;
}

export default function PersistentVolumeDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  persistentVolumeName: string | null;
}) {
  const { retryNonce } = useConnectionState();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PersistentVolumeDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");
  const [drawerPVC, setDrawerPVC] = useState<{ name: string; namespace: string } | null>(null);

  const name = props.persistentVolumeName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setDrawerPVC(null);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(`/api/persistentvolumes/${encodeURIComponent(name)}`, props.token);
      const item: PersistentVolumeDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<any>(`/api/persistentvolumes/${encodeURIComponent(name)}/events`, props.token);
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, props.token, retryNonce]);

  const summary = details?.summary;
  const spec = details?.spec;
  const metadata = details?.metadata;
  const status = details?.status;
  const claimRef = summary?.claimRef;
  const claimNs = claimRef?.namespace || "";
  const claimName = claimRef?.name || "";

  const pvcAccess = useAccessReview({
    token: props.token,
    resource: listResourceAccess.persistentvolumeclaims,
    namespace: claimNs || null,
    verb: "get",
    enabled: !!claimName && !!claimNs,
  });
  const showPvcDeniedHint = !!claimName && !!claimNs && pvcAccess.allowed === false;

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      {
        label: "Phase",
        value: <Chip size="small" label={valueOrDash(summary?.phase)} color={pvPhaseChipColor(summary?.phase)} />,
      },
      { label: "Capacity", value: valueOrDash(summary?.capacity) },
      { label: "Access Modes", value: formatAccessModes(summary?.accessModes) },
      { label: "Storage Class", value: valueOrDash(summary?.storageClassName) },
      { label: "Reclaim Policy", value: valueOrDash(summary?.reclaimPolicy) },
      { label: "Volume Mode", value: valueOrDash(summary?.volumeMode) },
      {
        label: "Claim",
        value: claimName ? (
          <ResourceLinkChip
            label={formatClaimRef(claimRef)}
            onClick={
              claimNs && pvcAccess.allowed ? () => setDrawerPVC({ name: claimName, namespace: claimNs }) : undefined
            }
            sx={!claimNs || !pvcAccess.allowed ? { opacity: 0.6 } : undefined}
          />
        ) : (
          "-"
        ),
        monospace: true,
      },
      { label: "Age", value: fmtAge(summary?.ageSec) },
      { label: "Created", value: summary?.createdAt ? fmtTs(summary.createdAt) : "-" },
    ],
    [summary, claimName, claimNs, pvcAccess.allowed, claimRef]
  );

  const source = spec?.volumeSource;
  const sourceDetails = source?.details || [];
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
            PV: {name || "-"}
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
                    {showPvcDeniedHint ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        Access denied: you don't have permission to view PersistentVolumeClaims.
                      </Typography>
                    ) : null}
                  </Box>

                  <Section title="Status">
                    {conditions.length === 0 ? (
                      <EmptyState message="No conditions reported for this PV." sx={{ mt: 1 }} />
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
                        { label: "Storage Class", value: valueOrDash(spec?.storageClassName) },
                        { label: "Reclaim Policy", value: valueOrDash(spec?.reclaimPolicy) },
                        { label: "Capacity", value: valueOrDash(status?.capacity) },
                        { label: "Mount Options", value: formatMountOptions(spec?.mountOptions) },
                      ]}
                    />
                  </Section>

                  <Section title="Volume Source">
                    {!source?.type && sourceDetails.length === 0 ? (
                      <EmptyState message="No volume source details available." sx={{ mt: 1 }} />
                    ) : (
                      <KeyValueTable
                        columns={2}
                        sx={{ mt: 1 }}
                        rows={[
                          { label: "Type", value: valueOrDash(source?.type) },
                          ...sourceDetails.map((d) => ({ label: d.label, value: valueOrDash(d.value) })),
                        ]}
                      />
                    )}
                  </Section>
                </Box>
              )}

              {/* EVENTS */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <EmptyState message="No events found for this PV." />
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

      <PersistentVolumeClaimDrawer
        open={!!drawerPVC}
        onClose={() => setDrawerPVC(null)}
        token={props.token}
        namespace={drawerPVC?.namespace || ""}
        persistentVolumeClaimName={drawerPVC?.name || null}
      />
    </Drawer>
  );
}
