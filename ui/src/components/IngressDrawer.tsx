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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { apiGet } from "../api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ServiceDrawer from "./ServiceDrawer";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { eventChipColor } from "../utils/k8sUi";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";

type IngressDetails = {
  summary: IngressSummary;
  rules: IngressRule[];
  tls: IngressTLS[];
  defaultBackend?: IngressBackend;
  warnings: IngressWarnings;
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

type IngressSummary = {
  name: string;
  namespace: string;
  ingressClassName?: string;
  addresses?: string[];
  hosts?: string[];
  tlsCount?: number;
  ageSec?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

type IngressRule = {
  host: string;
  paths: IngressPath[];
};

type IngressPath = {
  path: string;
  pathType: string;
  backendServiceName: string;
  backendServicePort: string;
};

type IngressTLS = {
  secretName: string;
  hosts?: string[];
};

type IngressBackend = {
  serviceName: string;
  servicePort: string;
};

type IngressWarnings = {
  missingBackendServices?: string[];
  noReadyEndpoints?: string[];
};

function formatHostsSummary(hosts?: string[]) {
  if (!hosts || hosts.length === 0) return "-";
  const short = hosts.slice(0, 3).join(", ");
  if (hosts.length <= 3) return `${hosts.length} (${short})`;
  return `${hosts.length} (${short}, +${hosts.length - 3} more)`;
}

function formatAddresses(addrs?: string[]) {
  if (!addrs || addrs.length === 0) return "-";
  return addrs.join(", ");
}

function formatTLSCount(count?: number) {
  if (!count || count <= 0) return "0";
  return String(count);
}

export default function IngressDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  ingressName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<IngressDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");
  const [drawerService, setDrawerService] = useState<string | null>(null);

  const ns = props.namespace;
  const name = props.ingressName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setDrawerService(null);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/ingresses/${encodeURIComponent(name)}`,
        props.token
      );
      const item: IngressDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/ingresses/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token]);

  const summary = details?.summary;
  const warnings = details?.warnings;
  const missingBackends = warnings?.missingBackendServices || [];
  const noReadyBackends = warnings?.noReadyEndpoints || [];
  const hasWarnings = missingBackends.length > 0 || noReadyBackends.length > 0;

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name) },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      { label: "Ingress Class", value: valueOrDash(summary?.ingressClassName) },
      { label: "Addresses", value: formatAddresses(summary?.addresses) },
      { label: "Hosts", value: formatHostsSummary(summary?.hosts) },
      { label: "TLS Entries", value: formatTLSCount(summary?.tlsCount) },
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
            Ingress: {name || "-"} <Typography component="span" variant="body2">({ns})</Typography>
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
              <Tab label="Rules" />
              <Tab label="TLS" />
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

                  <Accordion
                    defaultExpanded={hasWarnings}
                    sx={{
                      border: hasWarnings ? "1px solid rgba(255, 152, 0, 0.6)" : "1px solid transparent",
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Warnings</Typography>
                      {hasWarnings && <Chip size="small" color="warning" label="Attention" sx={{ ml: 1 }} />}
                    </AccordionSummary>
                    <AccordionDetails>
                      {!hasWarnings ? (
                        <EmptyState message="No warnings detected." />
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {missingBackends.length > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Missing backend services
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                                {missingBackends.map((svc) => (
                                  <Chip key={`missing-${svc}`} size="small" color="warning" label={svc} />
                                ))}
                              </Box>
                            </Box>
                          )}
                          {noReadyBackends.length > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Backend services with 0 ready endpoints
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                                {noReadyBackends.map((svc) => (
                                  <Chip key={`noready-${svc}`} size="small" color="warning" label={svc} />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  <Section title="Default Backend">
                    {!details?.defaultBackend?.serviceName ? (
                      <EmptyState message="No default backend configured." sx={{ mt: 1 }} />
                    ) : (
                      <KeyValueTable
                        columns={2}
                        sx={{ mt: 1 }}
                        rows={[
                          { label: "Service", value: valueOrDash(details.defaultBackend.serviceName) },
                          { label: "Port", value: valueOrDash(details.defaultBackend.servicePort) },
                        ]}
                      />
                    )}
                  </Section>

                  <Section title="Metadata">
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Labels
                      </Typography>
                      {Object.entries(summary?.labels || {}).length === 0 ? (
                        <EmptyState message="No labels." sx={{ mt: 0.5 }} />
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(summary?.labels || {}).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}=${v}`} />
                          ))}
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Annotations
                      </Typography>
                      {Object.entries(summary?.annotations || {}).length === 0 ? (
                        <EmptyState message="No annotations." sx={{ mt: 0.5 }} />
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(summary?.annotations || {}).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}=${v}`} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Section>
                </Box>
              )}

              {/* RULES */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "100%", overflow: "auto" }}>
                  {(details?.rules || []).length === 0 ? (
                    <EmptyState message="No rules configured for this Ingress." />
                  ) : (
                    (details?.rules || []).map((rule, idx) => (
                      <Section
                        key={`${rule.host || "rule"}-${idx}`}
                        title={`Host: ${valueOrDash(rule.host)}`}
                        dividerPlacement="content"
                        sx={{ mt: idx === 0 ? 0 : 1 }}
                      >
                        {(rule.paths || []).length === 0 ? (
                          <EmptyState message="No paths configured for this host." sx={{ mt: 1 }} />
                        ) : (
                          <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Path</TableCell>
                                <TableCell>PathType</TableCell>
                                <TableCell>Backend Service</TableCell>
                                <TableCell>Backend Port</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(rule.paths || []).map((p, pIdx) => (
                                <TableRow key={`${rule.host || "rule"}-${p.path || "path"}-${pIdx}`} hover>
                                  <TableCell>{valueOrDash(p.path)}</TableCell>
                                  <TableCell>{valueOrDash(p.pathType)}</TableCell>
                                  <TableCell>
                                    {p.backendServiceName ? (
                                      <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => setDrawerService(p.backendServiceName)}
                                        sx={{ textTransform: "none", p: 0, minWidth: "auto" }}
                                      >
                                        {p.backendServiceName}
                                      </Button>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell>{valueOrDash(p.backendServicePort)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Section>
                    ))
                  )}
                </Box>
              )}

              {/* TLS */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {(details?.tls || []).length === 0 ? (
                    <EmptyState message="No TLS configured for this Ingress." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Secret</TableCell>
                          <TableCell>Hosts</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(details?.tls || []).map((t, idx) => (
                          <TableRow key={`${t.secretName || "tls"}-${idx}`}>
                            <TableCell>{valueOrDash(t.secretName)}</TableCell>
                            <TableCell>{valueOrDash((t.hosts || []).join(", "))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* EVENTS */}
              {tab === 3 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <EmptyState message="No events found for this Ingress." />
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
              {tab === 4 && (
                <Box sx={{ border: "1px solid #ddd", borderRadius: 2, overflow: "auto", height: "100%" }}>
                  <SyntaxHighlighter language="yaml" showLineNumbers wrapLongLines>
                    {details?.yaml || ""}
                  </SyntaxHighlighter>
                </Box>
              )}
            </Box>
            <ServiceDrawer
              open={!!drawerService}
              onClose={() => setDrawerService(null)}
              token={props.token}
              namespace={ns}
              serviceName={drawerService}
            />
          </>
        )}
      </Box>
    </Drawer>
  );
}
