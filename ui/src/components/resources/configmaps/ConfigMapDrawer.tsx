import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { apiGet } from "../../../api";
import { useConnectionState } from "../../../connectionState";
import { fmtAge, fmtTs, valueOrDash } from "../../../utils/format";
import { detectLanguageFromKey } from "../../../utils/syntaxDetect";
import Section from "../../shared/Section";
import KeyValueTable from "../../shared/KeyValueTable";
import EmptyState from "../../shared/EmptyState";
import ErrorState from "../../shared/ErrorState";
import AttentionSummary, {
  type AttentionHealth,
  type AttentionReason,
} from "../../shared/AttentionSummary";
import MetadataSection from "../../shared/MetadataSection";
import EventsList from "../../shared/EventsList";
import CodeBlock from "../../shared/CodeBlock";
import ConfigMapActions from "./ConfigMapActions";
import RightDrawer from "../../layout/RightDrawer";
import ResourceDrawerShell from "../../shared/ResourceDrawerShell";
import type { ApiItemResponse, ApiListResponse, DashboardSignalItem } from "../../../types/api";
import useResourceSignals from "../../../utils/useResourceSignals";
import {
  panelBoxSx,
  drawerBodySx,
  drawerTabContentSx,
  loadingCenterSx,
  monospaceSx,
} from "../../../theme/sxTokens";

type ConfigMapDetails = {
  summary: ConfigMapSummary;
  keys: ConfigMapKey[];
  keyNames: string[];
  data?: Record<string, string>;
  metadata: ConfigMapMetadata;
  yaml: string;
};

type ConfigMapSummary = {
  name: string;
  namespace: string;
  immutable?: boolean;
  dataKeysCount: number;
  binaryKeysCount: number;
  keysCount: number;
  totalBytes?: number;
  createdAt?: number;
  ageSec?: number;
};

type ConfigMapKey = {
  name: string;
  type: string;
  sizeBytes: number;
};

type ConfigMapMetadata = {
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

function formatImmutable(val?: boolean) {
  if (val === undefined || val === null) return "-";
  return val ? "Yes" : "No";
}

function formatBytes(bytes?: number) {
  if (bytes === undefined || bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

const MAX_VALUE_PREVIEW_CHARS = 4096;

type ParsedDataValue = {
  value: string;
  truncated: boolean;
};

function appendWithLimit(current: ParsedDataValue, chunk: string, limit: number) {
  if (current.truncated) return;
  const remaining = limit - current.value.length;
  if (remaining <= 0) {
    current.truncated = true;
    return;
  }
  if (chunk.length <= remaining) {
    current.value += chunk;
  } else {
    current.value += chunk.slice(0, remaining);
    current.truncated = true;
  }
}

function mapConfigMapDataValues(
  data: Record<string, string> | undefined,
  limit: number
): Record<string, ParsedDataValue> {
  const values: Record<string, ParsedDataValue> = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    const entry = { value: "", truncated: false };
    appendWithLimit(entry, value, limit);
    values[key] = entry;
  });
  return values;
}

export default function ConfigMapDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  configMapName: string | null;
}) {
  const { retryNonce } = useConnectionState();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<ConfigMapDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const ns = props.namespace;
  const name = props.configMapName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setExpandedKeys({});
    setLoading(true);

    (async () => {
      const det = await apiGet<ApiItemResponse<ConfigMapDetails>>(
        `/api/namespaces/${encodeURIComponent(ns)}/configmaps/${encodeURIComponent(name)}`,
        props.token
      );
      const item: ConfigMapDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<ApiListResponse<EventDTO>>(
        `/api/namespaces/${encodeURIComponent(ns)}/configmaps/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token, retryNonce]);

  const summary = details?.summary;
  const metadata = details?.metadata;
  const resourceSignals = useResourceSignals({
    token: props.token,
    scope: "namespace",
    namespace: ns,
    kind: "configmaps",
    name: name || "",
    enabled: !!props.open && !!name,
    refreshKey: retryNonce,
  });

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      { label: "Keys", value: valueOrDash(summary?.keysCount) },
      { label: "Data keys", value: valueOrDash(summary?.dataKeysCount) },
      { label: "Binary keys", value: valueOrDash(summary?.binaryKeysCount) },
      { label: "Immutable", value: formatImmutable(summary?.immutable) },
      { label: "Age", value: fmtAge(summary?.ageSec) },
      { label: "Created", value: summary?.createdAt ? fmtTs(summary.createdAt) : "-" },
    ],
    [summary]
  );

  const hasKeys = (details?.keys || []).length > 0;
  const showSize = summary?.totalBytes !== undefined;
  const dataValues = useMemo(() => mapConfigMapDataValues(details?.data, MAX_VALUE_PREVIEW_CHARS), [details?.data]);
  const configMapSignals = useMemo<DashboardSignalItem[]>(
    () => resourceSignals.signals || [],
    [resourceSignals.signals],
  );

  const attentionHealth = useMemo<AttentionHealth | undefined>(() => {
    if (!summary) return undefined;
    const tone: AttentionHealth["tone"] = summary.immutable ? "success" : "default";
    return {
      label: `Keys ${summary.keysCount || 0} · Data ${summary.dataKeysCount || 0} · Binary ${summary.binaryKeysCount || 0}`,
      tone,
      tooltip: `Immutable ${summary.immutable ? "yes" : "no"} · Total size ${formatBytes(summary.totalBytes)}`,
    };
  }, [summary]);

  const attentionReasons = useMemo<AttentionReason[]>(() => {
    const reasons: AttentionReason[] = [];
    if (!summary) return reasons;
    if ((summary.keysCount || 0) === 0) {
      reasons.push({ label: "ConfigMap has no keys", severity: "warning" });
    }
    if ((summary.totalBytes || 0) > 1024 * 1024) {
      reasons.push({ label: `Large payload (${formatBytes(summary.totalBytes)})`, severity: "warning" });
    }
    return reasons;
  }, [summary]);

  const warningEvents = useMemo(
    () => events.filter((e) => String(e.type).toLowerCase() === "warning").slice(0, 5),
    [events],
  );

  return (
    <RightDrawer open={props.open} onClose={props.onClose}>
      <ResourceDrawerShell
        title={
          <>
            ConfigMap: {name || "-"}{" "}
            <Typography component="span" variant="body2">
              ({ns})
            </Typography>
          </>
        }
        onClose={props.onClose}
      >
        {loading ? (
          <Box sx={loadingCenterSx}>
            <CircularProgress />
          </Box>
        ) : err ? (
          <ErrorState message={err} />
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Overview" />
              <Tab label="Keys" />
              <Tab label="Events" />
              <Tab label="Metadata" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={drawerBodySx}>
              {/* OVERVIEW */}
              {tab === 0 && (
                <Box sx={drawerTabContentSx}>
                  {name && (
                    <Section title="Actions" divider={false}>
                      <ConfigMapActions
                        token={props.token}
                        namespace={ns}
                        configMapName={name}
                        onDeleted={props.onClose}
                      />
                    </Section>
                  )}

                  <AttentionSummary
                    health={attentionHealth}
                    reasons={attentionReasons}
                    signals={configMapSignals}
                    onJumpToEvents={() => setTab(2)}
                  />

                  {showSize && (
                    <Section title="Size">
                      <KeyValueTable
                        columns={2}
                        sx={{ mt: 1 }}
                        rows={[
                          { label: "Total", value: formatBytes(summary?.totalBytes) },
                        ]}
                      />
                    </Section>
                  )}

                  <Section title="Recent Warning events">
                    <Box sx={panelBoxSx}>
                      <EventsList events={warningEvents} emptyMessage="No recent warning events." />
                    </Box>
                  </Section>
                </Box>
              )}

              {/* KEYS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {!hasKeys ? (
                    <EmptyState message="No keys found for this ConfigMap." />
                  ) : (
                    (details?.keys || []).map((k, idx) => {
                      const keyId = `${k.type || "data"}:${k.name || idx}`;
                      const isBinary = k.type === "binaryData";
                      const dataValue = dataValues[k.name];
                      const showValue = !isBinary && dataValue;
                      const truncated = showValue ? dataValue.truncated : false;

                      return (
                        <Accordion
                          key={keyId}
                          expanded={!!expandedKeys[keyId]}
                          onChange={() =>
                            setExpandedKeys((prev) => ({
                              ...prev,
                              [keyId]: !prev[keyId],
                            }))
                          }
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", flexGrow: 1 }}>
                              <Typography variant="subtitle2" sx={monospaceSx}>
                                {valueOrDash(k.name)}
                              </Typography>
                              {k.type && <Chip size="small" label={k.type} />}
                              {k.sizeBytes !== undefined && <Chip size="small" label={formatBytes(k.sizeBytes)} />}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            {isBinary ? (
                              <Box
                                sx={{
                                  border: "1px solid var(--panel-border)",
                                  borderRadius: 2,
                                  p: 1,
                                  backgroundColor: "var(--code-bg)",
                                  ...monospaceSx,
                                  whiteSpace: "pre-wrap",
                                  fontSize: "0.8125rem",
                                }}
                              >
                                Binary data (base64) — see YAML tab.
                              </Box>
                            ) : dataValue ? (
                              <>
                                {truncated && (
                                  <Typography variant="caption" color="text.secondary">
                                    Showing first {MAX_VALUE_PREVIEW_CHARS} characters… See full content in YAML tab.
                                  </Typography>
                                )}
                                <Box sx={{ mt: truncated ? 0.5 : 0 }}>
                                  <CodeBlock code={dataValue.value} language={detectLanguageFromKey(k.name)} showCopy />
                                </Box>
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Value not available. See YAML tab.
                              </Typography>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })
                  )}
                </Box>
              )}

              {/* EVENTS */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  <EventsList events={events} emptyMessage="No events found for this ConfigMap." />
                </Box>
              )}

              {/* METADATA */}
              {tab === 3 && (
                <Box sx={drawerTabContentSx}>
                  <Box sx={panelBoxSx}>
                    <KeyValueTable rows={summaryItems} columns={3} />
                  </Box>
                  <MetadataSection labels={metadata?.labels} annotations={metadata?.annotations} />
                </Box>
              )}

              {/* YAML */}
              {tab === 4 && (
                <CodeBlock code={details?.yaml || ""} language="yaml" />
              )}
            </Box>
          </>
        )}
      </ResourceDrawerShell>
    </RightDrawer>
  );
}
