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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { apiGet } from "../api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { namespacePhaseChipColor } from "../utils/k8sUi";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";
import Section from "./shared/Section";

type NamespaceDetails = {
  summary: NamespaceSummary;
  metadata: NamespaceMetadata;
  conditions: NamespaceCondition[];
  yaml: string;
};

type NamespaceSummary = {
  name: string;
  phase: string;
  createdAt: number;
  ageSec: number;
};

type NamespaceMetadata = {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

type NamespaceCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: number;
};

function isNamespaceConditionHealthy(cond: NamespaceCondition): boolean {
  return cond.status === "False";
}

function namespaceConditionChipColor(status?: string): "success" | "warning" | "error" | "default" {
  if (status === "True") return "error";
  if (status === "False") return "success";
  if (status === "Unknown") return "warning";
  return "default";
}

export default function NamespaceDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespaceName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<NamespaceDetails | null>(null);
  const [err, setErr] = useState("");

  const name = props.namespaceName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(`/api/namespaces/${encodeURIComponent(name)}`, props.token);
      const item: NamespaceDetails | null = det?.item ?? null;
      setDetails(item);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, props.token]);

  const summary = details?.summary;
  const metadata = details?.metadata;
  const conditions = details?.conditions || [];
  const hasUnhealthyConditions = conditions.some((c) => !isNamespaceConditionHealthy(c));

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      {
        label: "Phase",
        value: (
          <Chip size="small" label={valueOrDash(summary?.phase)} color={namespacePhaseChipColor(summary?.phase)} />
        ),
      },
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
            Namespace: {name || "-"}
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
              <Tab label="Conditions" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OVERVIEW */}
              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.5 }}>
                    <KeyValueTable rows={summaryItems} columns={3} />
                  </Box>

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

              {/* CONDITIONS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  <Accordion defaultExpanded={hasUnhealthyConditions}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Namespace Conditions</Typography>
                      {hasUnhealthyConditions && (
                        <Chip size="small" color="error" label="Unhealthy" sx={{ ml: 1 }} />
                      )}
                    </AccordionSummary>
                    <AccordionDetails>
                      {conditions.length === 0 ? (
                        <EmptyState message="No conditions reported." />
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Condition</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Reason</TableCell>
                              <TableCell>Message</TableCell>
                              <TableCell>Last Transition</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {conditions.map((c, idx) => {
                              const unhealthy = !isNamespaceConditionHealthy(c);
                              return (
                                <TableRow
                                  key={c.type || String(idx)}
                                  sx={{
                                    backgroundColor: unhealthy ? "rgba(211, 47, 47, 0.08)" : "transparent",
                                  }}
                                >
                                  <TableCell>{valueOrDash(c.type)}</TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={valueOrDash(c.status)}
                                      color={namespaceConditionChipColor(c.status)}
                                    />
                                  </TableCell>
                                  <TableCell>{valueOrDash(c.reason)}</TableCell>
                                  <TableCell sx={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                                    {valueOrDash(c.message)}
                                  </TableCell>
                                  <TableCell>{c.lastTransitionTime ? fmtTs(c.lastTransitionTime) : "-"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {/* YAML */}
              {tab === 2 && (
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
