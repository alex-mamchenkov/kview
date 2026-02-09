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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { apiGet } from "../api";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { eventChipColor } from "../utils/k8sUi";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";

type SecretDetails = {
  summary: SecretSummary;
  keyNames: string[];
  metadata: SecretMetadata;
};

type SecretSummary = {
  name: string;
  namespace: string;
  type: string;
  immutable?: boolean;
  keysCount: number;
  createdAt?: number;
  ageSec?: number;
};

type SecretMetadata = {
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

export default function SecretDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  secretName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<SecretDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");

  const ns = props.namespace;
  const name = props.secretName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/secrets/${encodeURIComponent(name)}`,
        props.token
      );
      const item: SecretDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/secrets/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token]);

  const summary = details?.summary;
  const metadata = details?.metadata;

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      { label: "Type", value: valueOrDash(summary?.type), monospace: true },
      { label: "Keys", value: valueOrDash(summary?.keysCount) },
      { label: "Immutable", value: formatImmutable(summary?.immutable) },
      { label: "Age", value: fmtAge(summary?.ageSec) },
      { label: "Created", value: summary?.createdAt ? fmtTs(summary.createdAt) : "-" },
    ],
    [summary]
  );

  const keys = details?.keyNames || [];

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
            Secret: {name || "-"}{" "}
            <Typography component="span" variant="body2">
              ({ns})
            </Typography>
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
              <Tab label="Keys" />
              <Tab label="Events" />
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

              {/* KEYS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  <Typography variant="caption" color="text.secondary">
                    Secret values are not displayed.
                  </Typography>
                  {keys.length === 0 ? (
                    <EmptyState message="No keys found for this Secret." />
                  ) : (
                    <Box sx={{ border: "1px solid #ddd", borderRadius: 2, overflow: "hidden" }}>
                      {keys.map((k, idx) => (
                        <Box
                          key={k || idx}
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderBottom: idx === keys.length - 1 ? "none" : "1px solid #eee",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                            {valueOrDash(k)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* EVENTS */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <EmptyState message="No events found for this Secret." />
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
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
