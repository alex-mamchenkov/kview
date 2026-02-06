import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Drawer,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Divider,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { apiGet } from "../api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

type PodDetails = {
  summary: {
    name: string;
    namespace: string;
    node?: string;
    phase: string;
    ready: string;
    restarts: number;
  };
  yaml: string;
  containers: string[];
};

type EventDTO = {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
};

function wsURL(path: string, token: string) {
  const u = new URL(window.location.href);
  const proto = u.protocol === "https:" ? "wss:" : "ws:";
  const sep = path.includes("?") ? "&" : "?";
  return `${proto}//${u.host}${path}${sep}token=${encodeURIComponent(token)}`;
}

function fmtTs(unix: number) {
  if (!unix) return "";
  const d = new Date(unix * 1000);
  return d.toLocaleString();
}

function tryPrettyJSONLine(line: string): string | null {
  const s = line.trim();
  if (!s) return null;
  try {
    const obj = JSON.parse(s);
    return JSON.stringify(obj, null, 2);
  } catch {
    return null;
  }
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

function formatPrettyWithLineNumbers(lines: string[]): { text: string; hiddenLineNumbers: Set<number> } {
  const out: string[] = [];
  const hidden = new Set<number>();
  let lineNo = 1;

  lines.forEach((line) => {
    const prettyStr = tryPrettyJSONLine(line);
    if (prettyStr) {
      const parts = prettyStr.split("\n");
      parts.forEach((p, i) => {
        out.push(p);
        if (i > 0) hidden.add(lineNo);
        lineNo++;
      });
    } else {
      out.push(line);
      lineNo++;
    }
  });
  return { text: out.join("\n"), hiddenLineNumbers: hidden };
}

export default function PodDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  podName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PodDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");

  // Logs UI state
  const [container, setContainer] = useState<string>("");
  const [logsFilter, setLogsFilter] = useState<string>("");
  const [pretty, setPretty] = useState<boolean>(false);
  const [following, setFollowing] = useState<boolean>(false);
  const [lineLimit, setLineLimit] = useState<number>(500);
  const [wrapLines, setWrapLines] = useState<boolean>(false);

  // Store log entries as array for filtering + pretty formatting
  const [logLines, setLogLines] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const logScrollRef = useRef<HTMLDivElement | null>(null);

  const ns = props.namespace;
  const name = props.podName;

  const logWsBase = useMemo(() => {
    if (!name) return "";
    return `/api/namespaces/${encodeURIComponent(ns)}/pods/${encodeURIComponent(name)}/logs/ws`;
  }, [name, ns]);

  function stopLogs() {
    setFollowing(false);
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }

  function startLogsFollow() {
    if (!name) return;

    stopLogs();
    setLogLines([]);

    const qs = new URLSearchParams();
    if (container) qs.set("container", container);
    qs.set("follow", "1");
    if (lineLimit > 0) {
      qs.set("tail", String(Math.min(lineLimit, 5000)));
    }

    const ws = new WebSocket(wsURL(`${logWsBase}?${qs.toString()}`, props.token));
    wsRef.current = ws;
    setFollowing(true);

    ws.onmessage = (ev) => {
      const chunk = String(ev.data ?? "");
      // logs stream usually already ends with \n, but keep safe
      const parts = chunk.split("\n");
      setLogLines((prev) => {
        const next = [...prev];
        for (const p of parts) {
          if (p.length) next.push(p);
        }
        // avoid unbounded growth in MVP
        if (next.length > 5000) return next.slice(next.length - 5000);
        return next;
      });
    };

    ws.onerror = () => {
      setLogLines((prev) => [...prev, "[WS ERROR]"]);
      setFollowing(false);
    };

    ws.onclose = () => {
      setFollowing(false);
    };
  }

  // Cleanup on close / pod switch
  useEffect(() => {
    if (!props.open) {
      stopLogs();
      return;
    }
    return () => stopLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, name]);

  // Load pod details + events when opened
  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setLogLines([]);
    setLogsFilter("");
    setPretty(false);
    setWrapLines(false);
    stopLogs();

    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/pods/${encodeURIComponent(name)}`,
        props.token
      );
      const item: PodDetails = det.item;
      setDetails(item);

      // default container
      const containers = item.containers || [];
      setContainer(containers[0] || "");

      const ev = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/pods/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, name, ns, props.token]);

  const { renderedLogs, hiddenLineNumbers } = useMemo(() => {
    const q = logsFilter.trim().toLowerCase();

    const filtered = q
      ? logLines.filter((l) => l.toLowerCase().includes(q))
      : logLines;

    const limited = lineLimit > 0 ? filtered.slice(-lineLimit) : filtered;

    if (!pretty) {
      return { renderedLogs: limited.join("\n"), hiddenLineNumbers: new Set<number>() };
    }

    // Pretty: try parse each line as JSON; if parsed -> pretty multi-line
    // If not JSON -> keep as-is line.
    const formatted = formatPrettyWithLineNumbers(limited);
    return { renderedLogs: formatted.text, hiddenLineNumbers: formatted.hiddenLineNumbers };
  }, [logLines, logsFilter, pretty, lineLimit]);

  useEffect(() => {
    if (!following) return;
    const el = logScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [renderedLogs, following]);

  const summary = details?.summary;

  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      PaperProps={{
        sx: {
          // AppBar is 64px (mt: 8), keep drawer below it
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
            Pod: {name || "-"} <Typography component="span" variant="body2">({ns})</Typography>
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
              <Tab label="Logs" />
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* SUMMARY */}
              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip label={`Phase: ${summary?.phase || "-"}`} />
                    <Chip label={`Ready: ${summary?.ready || "-"}`} />
                    <Chip label={`Restarts: ${summary?.restarts ?? "-"}`} />
                    <Chip label={`Node: ${summary?.node || "-"}`} />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    (Next: сюда можно добавить conditions, images, owner refs и quick actions)
                  </Typography>
                </Box>
              )}

              {/* EVENTS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <Typography variant="body2">No events found for this Pod.</Typography>
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

              {/* LOGS */}
              {tab === 3 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "100%" }}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id="container-label">Container</InputLabel>
                      <Select
                        labelId="container-label"
                        label="Container"
                        value={container}
                        onChange={(e) => setContainer(String(e.target.value))}
                      >
                        {(details?.containers || []).map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
                        {(!details?.containers || details.containers.length === 0) && (
                          <MenuItem value="">(no containers)</MenuItem>
                        )}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel id="lines-label">Lines</InputLabel>
                      <Select
                        labelId="lines-label"
                        label="Lines"
                        value={lineLimit}
                        onChange={(e) => setLineLimit(Number(e.target.value))}
                      >
                        {[100, 500, 1000, 5000].map((n) => (
                          <MenuItem key={n} value={n}>
                            {n}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      size="small"
                      label="Filter pattern"
                      value={logsFilter}
                      onChange={(e) => setLogsFilter(e.target.value)}
                      sx={{ minWidth: 240 }}
                    />

                    <FormControlLabel
                      control={<Switch checked={pretty} onChange={(e) => setPretty(e.target.checked)} />}
                      label="Pretty"
                    />

                    <FormControlLabel
                      control={<Switch checked={wrapLines} onChange={(e) => setWrapLines(e.target.checked)} />}
                      label="Wrap lines"
                    />

                    <Box sx={{ flexGrow: 1 }} />

                    <Button variant="contained" onClick={startLogsFollow} disabled={following || !name}>
                      Follow
                    </Button>
                    <Button variant="outlined" onClick={stopLogs} disabled={!following}>
                      Stop
                    </Button>
                  </Box>

                  <Box
                    ref={logScrollRef}
                    sx={{ border: "1px solid #ddd", borderRadius: 2, overflow: "auto", flexGrow: 1 }}
                  >
                    <SyntaxHighlighter
                      key={`${pretty}-${wrapLines}`}
                      language={pretty ? "json" : "text"}
                      wrapLongLines={wrapLines}
                      showLineNumbers
                      lineNumberStyle={(lineNumber) =>
                        hiddenLineNumbers.has(lineNumber) ? { visibility: "hidden" } : {}
                      }
                      customStyle={{
                        margin: 0,
                        background: "transparent",
                        whiteSpace: wrapLines ? "pre-wrap" : "pre",
                      }}
                      codeTagProps={{
                        style: { whiteSpace: wrapLines ? "pre-wrap" : "pre" },
                      }}
                    >
                      {renderedLogs || ""}
                    </SyntaxHighlighter>
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}

