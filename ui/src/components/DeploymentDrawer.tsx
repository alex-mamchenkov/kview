import React, { useEffect, useState } from "react";
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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

type DeploymentDetails = {
  summary: {
    name: string;
    namespace: string;
    strategy: string;
    selector: string;
    desired: number;
    current: number;
    ready: number;
    available: number;
    upToDate: number;
  };
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

function fmtTs(unix: number) {
  if (!unix) return "";
  const d = new Date(unix * 1000);
  return d.toLocaleString();
}

function eventChipColor(kind: string): "success" | "warning" | "error" | "default" {
  switch (kind) {
    case "Normal":
      return "success";
    case "Warning":
      return "warning";
    default:
      return "default";
  }
}

export default function DeploymentDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  deploymentName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<DeploymentDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");

  const ns = props.namespace;
  const name = props.deploymentName;

  // Load deployment details + events when opened
  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/deployments/${encodeURIComponent(name)}`,
        props.token
      );
      const item: DeploymentDetails = det.item;
      setDetails(item);

      const ev = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/deployments/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, name, ns, props.token]);

  const summary = details?.summary;

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
            Deployment: {name || "-"} <Typography component="span" variant="body2">({ns})</Typography>
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
          <Typography color="error" sx={{ whiteSpace: "pre-wrap" }}>
            {err}
          </Typography>
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Summary" />
              <Tab label="Events" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* SUMMARY */}
              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip label={`Strategy: ${summary?.strategy || "-"}`} />
                    <Chip label={`Selector: ${summary?.selector || "-"}`} />
                    <Chip label={`Desired: ${summary?.desired ?? "-"}`} />
                    <Chip label={`Current: ${summary?.current ?? "-"}`} />
                    <Chip label={`Ready: ${summary?.ready ?? "-"}`} />
                    <Chip label={`Available: ${summary?.available ?? "-"}`} />
                    <Chip label={`Up-to-date: ${summary?.upToDate ?? "-"}`} />
                  </Box>
                </Box>
              )}

              {/* EVENTS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <Typography variant="body2">No events found for this Deployment.</Typography>
                  ) : (
                    events.map((e, idx) => (
                      <Box key={idx} sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.25 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Chip size="small" label={e.type || "Unknown"} color={eventChipColor(e.type)} />
                            <Typography variant="subtitle2">
                              {e.reason} (x{e.count})
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {fmtTs(e.lastSeen)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                          {e.message}
                        </Typography>
                      </Box>
                    ))
                  )}
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
