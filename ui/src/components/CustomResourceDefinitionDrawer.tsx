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
import { eventChipColor } from "../utils/k8sUi";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";

type CRDDetails = {
  summary: CRDSummary;
  versions: CRDVersion[];
  conditions: CRDCondition[];
  metadata: CRDMetadata;
  yaml: string;
};

type CRDSummary = {
  name: string;
  group?: string;
  scope?: string;
  kind?: string;
  plural?: string;
  singular?: string;
  shortNames?: string[];
  categories?: string[];
  conversionStrategy?: string;
  established?: boolean;
  ageSec?: number;
  createdAt?: number;
};

type CRDVersion = {
  name: string;
  served: boolean;
  storage: boolean;
  deprecated: boolean;
  deprecationWarning?: string;
};

type CRDCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: number;
};

type CRDMetadata = {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

type EventDTO = {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
};

export default function CustomResourceDefinitionDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  crdName: string | null;
}) {
  const { retryNonce } = useConnectionState();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<CRDDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");

  const name = props.crdName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(`/api/customresourcedefinitions/${encodeURIComponent(name)}`, props.token);
      const item: CRDDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<any>(`/api/customresourcedefinitions/${encodeURIComponent(name)}/events`, props.token);
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, props.token, retryNonce]);

  const summary = details?.summary;
  const versions = details?.versions || [];
  const conditions = details?.conditions || [];
  const metadata = details?.metadata;

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      { label: "Group", value: valueOrDash(summary?.group), monospace: true },
      { label: "Scope", value: valueOrDash(summary?.scope) },
      { label: "Kind", value: valueOrDash(summary?.kind) },
      { label: "Plural", value: valueOrDash(summary?.plural), monospace: true },
      { label: "Singular", value: valueOrDash(summary?.singular), monospace: true },
      {
        label: "Short Names",
        value: summary?.shortNames?.length ? summary.shortNames.join(", ") : "-",
        monospace: true,
      },
      {
        label: "Categories",
        value: summary?.categories?.length ? summary.categories.join(", ") : "-",
      },
      {
        label: "Conversion",
        value: valueOrDash(summary?.conversionStrategy),
      },
      {
        label: "Established",
        value: (
          <Chip
            size="small"
            label={summary?.established ? "Yes" : "No"}
            color={summary?.established ? "success" : "warning"}
          />
        ),
      },
      { label: "Age", value: fmtAge(summary?.ageSec) },
      { label: "Created", value: summary?.createdAt ? fmtTs(summary.createdAt) : "-" },
    ],
    [summary],
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
            CRD: {name || "-"}
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
              <Tab label="Versions" />
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

                  <Section title="Conditions">
                    {conditions.length === 0 ? (
                      <EmptyState message="No conditions reported for this CRD." sx={{ mt: 1 }} />
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
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={valueOrDash(c.status)}
                                  color={c.status === "True" ? "success" : c.status === "False" ? "error" : "default"}
                                />
                              </TableCell>
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

              {/* VERSIONS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  {versions.length === 0 ? (
                    <EmptyState message="No versions defined for this CRD." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Served</TableCell>
                          <TableCell>Storage</TableCell>
                          <TableCell>Deprecated</TableCell>
                          <TableCell>Deprecation Warning</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {versions.map((v, idx) => (
                          <TableRow key={`${v.name}-${idx}`}>
                            <TableCell sx={{ fontFamily: "monospace" }}>{valueOrDash(v.name)}</TableCell>
                            <TableCell>
                              <Chip size="small" label={v.served ? "Yes" : "No"} color={v.served ? "success" : "default"} />
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={v.storage ? "Yes" : "No"} color={v.storage ? "info" : "default"} />
                            </TableCell>
                            <TableCell>
                              {v.deprecated ? (
                                <Chip size="small" label="Deprecated" color="warning" />
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "pre-wrap" }}>{valueOrDash(v.deprecationWarning)}</TableCell>
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
                    <EmptyState message="No events found for this CRD." />
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
    </Drawer>
  );
}
