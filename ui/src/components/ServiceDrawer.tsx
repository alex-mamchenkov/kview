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
  Tooltip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { apiGet } from "../api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import PodDrawer from "./PodDrawer";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { eventChipColor } from "../utils/k8sUi";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";

type ServiceDetails = {
  summary: ServiceSummary;
  ports: ServicePort[];
  traffic: ServiceTraffic;
  endpoints: ServiceEndpoints;
  yaml: string;
};

type EventDTO = {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
};

type ServiceSummary = {
  name: string;
  namespace: string;
  type: string;
  clusterIPs?: string[];
  selector?: Record<string, string>;
  sessionAffinity?: string;
  ageSec?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

type ServicePort = {
  name?: string;
  port: number;
  targetPort?: string;
  protocol?: string;
  nodePort?: number;
};

type ServiceTraffic = {
  externalTrafficPolicy?: string;
  loadBalancerIngress?: string[];
};

type ServiceEndpoints = {
  ready: number;
  notReady: number;
  pods?: ServiceEndpointPod[];
};

type ServiceEndpointPod = {
  name: string;
  namespace: string;
  node?: string;
  ready: boolean;
};

function formatClusterIPs(ips?: string[]) {
  if (!ips || ips.length === 0) return "-";
  return ips.join(", ");
}

export default function ServiceDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  serviceName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<ServiceDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");
  const [drawerPod, setDrawerPod] = useState<string | null>(null);
  const [drawerPodNs, setDrawerPodNs] = useState<string>("");

  const ns = props.namespace;
  const name = props.serviceName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setDrawerPod(null);
    setDrawerPodNs("");
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/services/${encodeURIComponent(name)}`,
        props.token
      );
      const item: ServiceDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/services/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token]);

  const summary = details?.summary;
  const endpoints = details?.endpoints;
  const totalEndpoints = (endpoints?.ready || 0) + (endpoints?.notReady || 0);

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name) },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      { label: "Type", value: valueOrDash(summary?.type) },
      { label: "Cluster IPs", value: formatClusterIPs(summary?.clusterIPs) },
      {
        label: "Selector",
        value:
          Object.entries(summary?.selector || {}).length === 0 ? (
            "-"
          ) : (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {Object.entries(summary?.selector || {}).map(([k, v]) => (
                <Tooltip key={k} title={`${k}=${v}`} arrow>
                  <Chip size="small" label={`${k}=${v}`} />
                </Tooltip>
              ))}
            </Box>
          ),
      },
      { label: "Session Affinity", value: valueOrDash(summary?.sessionAffinity) },
      { label: "Age", value: fmtAge(summary?.ageSec) },
    ],
    [summary]
  );

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
            Service: {name || "-"} <Typography component="span" variant="body2">({ns})</Typography>
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
              <Tab label="Endpoints" />
              <Tab label="Events" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OVERVIEW */}
              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.5 }}>
                    <KeyValueTable rows={summaryItems} columns={3} />
                  </Box>

                  <Section title="Ports">
                    {(details?.ports || []).length === 0 ? (
                      <EmptyState message="No ports defined for this Service." sx={{ mt: 1 }} />
                    ) : (
                      <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Service Port</TableCell>
                            <TableCell>Target Port</TableCell>
                            <TableCell>Protocol</TableCell>
                            <TableCell>NodePort</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(details?.ports || []).map((p, idx) => (
                            <TableRow key={`${p.name ?? "port"}-${idx}`}>
                              <TableCell>{valueOrDash(p.name)}</TableCell>
                              <TableCell>{valueOrDash(p.port)}</TableCell>
                              <TableCell>{valueOrDash(p.targetPort)}</TableCell>
                              <TableCell>{valueOrDash(p.protocol)}</TableCell>
                              <TableCell>{p.nodePort ? p.nodePort : "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Section>

                  <Section title="Traffic Notes">
                    <KeyValueTable
                      columns={2}
                      sx={{ mt: 1 }}
                      rows={[
                        {
                          label: "External Traffic Policy",
                          value: valueOrDash(details?.traffic?.externalTrafficPolicy),
                        },
                        {
                          label: "LoadBalancer Ingress",
                          value: (details?.traffic?.loadBalancerIngress || []).join(", ") || "-",
                        },
                      ]}
                    />
                  </Section>

                  <Section title="Metadata">
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Labels
                      </Typography>
                      {Object.entries(details?.summary?.labels || {}).length === 0 ? (
                        <EmptyState message="No labels." sx={{ mt: 0.5 }} />
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(details?.summary?.labels || {}).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}=${v}`} />
                          ))}
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Annotations
                      </Typography>
                      {Object.entries(details?.summary?.annotations || {}).length === 0 ? (
                        <EmptyState message="No annotations." sx={{ mt: 0.5 }} />
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(details?.summary?.annotations || {}).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}=${v}`} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Section>
                </Box>
              )}

              {/* ENDPOINTS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip size="small" label={`Ready: ${endpoints?.ready ?? 0}`} color="success" />
                    <Chip size="small" label={`Not Ready: ${endpoints?.notReady ?? 0}`} color="warning" />
                    <Chip size="small" label={`Total: ${totalEndpoints}`} />
                  </Box>

                  {(details?.endpoints?.pods || []).length === 0 ? (
                    <EmptyState message="No endpoints found for this Service." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Pod</TableCell>
                          <TableCell>Namespace</TableCell>
                          <TableCell>Node</TableCell>
                          <TableCell>Ready</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(details?.endpoints?.pods || []).map((p, idx) => (
                          <TableRow
                            key={`${p.namespace}/${p.name}-${idx}`}
                            hover
                            onClick={() => {
                              if (!p.name) return;
                              setDrawerPod(p.name);
                              setDrawerPodNs(p.namespace || ns);
                            }}
                            sx={{ cursor: p.name ? "pointer" : "default" }}
                          >
                            <TableCell>{valueOrDash(p.name)}</TableCell>
                            <TableCell>{valueOrDash(p.namespace)}</TableCell>
                            <TableCell>{valueOrDash(p.node)}</TableCell>
                            <TableCell>
                              <Chip size="small" label={p.ready ? "Ready" : "Not Ready"} color={p.ready ? "success" : "warning"} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* EVENTS */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <EmptyState message="No events found for this Service." />
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
            <PodDrawer
              open={!!drawerPod}
              onClose={() => setDrawerPod(null)}
              token={props.token}
              namespace={drawerPodNs || ns}
              podName={drawerPod}
            />
          </>
        )}
      </Box>
    </Drawer>
  );
}
