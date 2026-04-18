import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { apiGet } from "../../../api";
import { useConnectionState } from "../../../connectionState";
import { fmtAge, fmtTs, valueOrDash } from "../../../utils/format";
import { conditionStatusColor, deploymentHealthBucketColor } from "../../../utils/k8sUi";
import RightDrawer from "../../layout/RightDrawer";
import ResourceDrawerShell from "../../shared/ResourceDrawerShell";
import Section from "../../shared/Section";
import KeyValueTable from "../../shared/KeyValueTable";
import EmptyState from "../../shared/EmptyState";
import ErrorState from "../../shared/ErrorState";
import AccessDeniedState from "../../shared/AccessDeniedState";
import MetadataSection from "../../shared/MetadataSection";
import EventsList from "../../shared/EventsList";
import CodeBlock from "../../shared/CodeBlock";
import type { ApiItemResponse, ApiListResponse, EventDTO } from "../../../types/api";
import { drawerBodySx, drawerTabContentCompactSx, loadingCenterSx, panelBoxSx } from "../../../theme/sxTokens";

type HPA = {
  name: string;
  namespace: string;
  scaleTargetRef?: { kind?: string; name?: string; apiVersion?: string };
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  currentMetrics?: HPAMetric[];
  conditions?: HPACondition[];
  ageSec: number;
  healthBucket?: string;
  needsAttention?: boolean;
  attentionReasons?: string[];
  lastScaleTime?: number;
};

type HPADetails = {
  summary: HPA;
  spec: {
    scaleTargetRef?: { kind?: string; name?: string; apiVersion?: string };
    minReplicas: number;
    maxReplicas: number;
    behavior?: string;
  };
  metrics?: HPAMetric[];
  conditions?: HPACondition[];
  metadata?: { labels?: Record<string, string>; annotations?: Record<string, string> };
  yaml: string;
};

type HPAMetric = {
  type: string;
  name?: string;
  target?: string;
  current?: string;
};

type HPACondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: number;
};

function targetRefText(ref?: { kind?: string; name?: string; apiVersion?: string }) {
  if (!ref?.kind && !ref?.name) return "-";
  const base = [ref.kind, ref.name].filter(Boolean).join("/");
  return ref.apiVersion ? `${base} (${ref.apiVersion})` : base;
}

export default function HorizontalPodAutoscalerDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  hpaName: string | null;
}) {
  const { retryNonce } = useConnectionState();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<HPADetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState(0);

  const ns = props.namespace;
  const name = props.hpaName;

  useEffect(() => {
    if (!props.open || !name) return;
    setLoading(true);
    setErr("");
    setDenied(false);
    setTab(0);
    setDetails(null);
    setEvents([]);

    (async () => {
      const det = await apiGet<ApiItemResponse<HPADetails>>(
        `/api/namespaces/${encodeURIComponent(ns)}/horizontalpodautoscalers/${encodeURIComponent(name)}`,
        props.token,
      );
      setDetails(det.item || null);
      const ev = await apiGet<ApiListResponse<EventDTO>>(
        `/api/namespaces/${encodeURIComponent(ns)}/horizontalpodautoscalers/${encodeURIComponent(name)}/events`,
        props.token,
      );
      setEvents(ev.items || []);
    })()
      .catch((e: unknown) => {
        const status = (e as { status?: number } | undefined)?.status;
        if (status === 401 || status === 403) setDenied(true);
        else setErr(String((e as Error | undefined)?.message || e || "Failed to load HPA"));
      })
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token, retryNonce]);

  return (
    <RightDrawer open={props.open} onClose={props.onClose}>
      <ResourceDrawerShell
        title={
          <>
            HPA: {name || "-"} <Typography component="span" variant="body2">({ns})</Typography>
          </>
        }
        onClose={props.onClose}
      >
        {loading ? (
          <Box sx={loadingCenterSx}><CircularProgress size={24} /></Box>
        ) : denied ? (
          <AccessDeniedState title="Access denied" message="You do not have permission to read this HorizontalPodAutoscaler." />
        ) : err ? (
          <ErrorState message={err} />
        ) : !details ? (
          <EmptyState message="No HPA details loaded." />
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Overview" />
              <Tab label="Metrics" />
              <Tab label="Conditions" />
              <Tab label="Events" />
              <Tab label="Metadata" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={drawerBodySx}>
              {tab === 0 && (
                <Box sx={drawerTabContentCompactSx}>
                  <Section
                    title="Summary"
                    actions={
                      <Chip
                        size="small"
                        label={details.summary.needsAttention ? "attention" : details.summary.healthBucket || "unknown"}
                        color={deploymentHealthBucketColor(details.summary.healthBucket)}
                      />
                    }
                  >
                    <Box sx={panelBoxSx}>
                      <KeyValueTable
                        rows={[
                          { label: "Namespace", value: details.summary.namespace },
                          { label: "Target", value: targetRefText(details.summary.scaleTargetRef) },
                          { label: "Replicas", value: `${details.summary.currentReplicas}/${details.summary.desiredReplicas}` },
                          { label: "Min / Max", value: `${details.summary.minReplicas} / ${details.summary.maxReplicas}` },
                          { label: "Last Scale", value: details.summary.lastScaleTime ? fmtTs(details.summary.lastScaleTime) : "-" },
                          { label: "Age", value: fmtAge(details.summary.ageSec, "detail") },
                        ]}
                        valueSx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                      />
                    </Box>
                    {details.summary.attentionReasons?.length ? (
                      <Box sx={{ mt: 1, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                        {details.summary.attentionReasons.map((reason) => (
                          <Chip key={reason} size="small" color="warning" label={reason} />
                        ))}
                      </Box>
                    ) : null}
                  </Section>

                  <Section title="Scaling Spec">
                    <Box sx={panelBoxSx}>
                      <KeyValueTable
                        rows={[
                          { label: "Scale Target", value: targetRefText(details.spec.scaleTargetRef) },
                          { label: "Min Replicas", value: details.spec.minReplicas },
                          { label: "Max Replicas", value: details.spec.maxReplicas },
                          { label: "Behavior", value: valueOrDash(details.spec.behavior) },
                        ]}
                        columns={2}
                      />
                    </Box>
                  </Section>
                </Box>
              )}

              {tab === 1 && (
                <Box sx={drawerTabContentCompactSx}>
                  {!details.metrics?.length ? (
                    <EmptyState message="No current metrics reported." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Current</TableCell>
                          <TableCell>Target</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {details.metrics.map((metric, idx) => (
                          <TableRow key={`${metric.type}-${metric.name || idx}`}>
                            <TableCell>{metric.type}</TableCell>
                            <TableCell>{valueOrDash(metric.name)}</TableCell>
                            <TableCell>{valueOrDash(metric.current)}</TableCell>
                            <TableCell>{valueOrDash(metric.target)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {tab === 2 && (
                <Box sx={drawerTabContentCompactSx}>
                  {!details.conditions?.length ? (
                    <EmptyState message="No conditions reported." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>Message</TableCell>
                          <TableCell>Changed</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {details.conditions.map((cond) => (
                          <TableRow key={cond.type}>
                            <TableCell>{cond.type}</TableCell>
                            <TableCell><Chip size="small" label={cond.status} color={conditionStatusColor(cond.status)} /></TableCell>
                            <TableCell>{valueOrDash(cond.reason)}</TableCell>
                            <TableCell><Typography variant="body2">{valueOrDash(cond.message)}</Typography></TableCell>
                            <TableCell>{cond.lastTransitionTime ? fmtTs(cond.lastTransitionTime) : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {tab === 3 && (
                <Box sx={drawerTabContentCompactSx}>
                  <EventsList events={events} />
                </Box>
              )}

              {tab === 4 && (
                <Box sx={drawerTabContentCompactSx}>
                  <MetadataSection labels={details.metadata?.labels} annotations={details.metadata?.annotations} wrapInSection={false} />
                </Box>
              )}

              {tab === 5 && (
                <Box sx={drawerTabContentCompactSx}>
                  <CodeBlock code={details.yaml || ""} language="yaml" />
                </Box>
              )}
            </Box>
          </>
        )}
      </ResourceDrawerShell>
    </RightDrawer>
  );
}
