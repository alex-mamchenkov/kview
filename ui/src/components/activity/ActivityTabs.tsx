import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Chip, IconButton, Tabs, Tab, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ActivityList from "./ActivityList";
import EmptyState from "../shared/EmptyState";
import { apiGet } from "../../api";
import TerminalSessionView from "./TerminalSessionView";
import { apiDelete } from "../../sessionsApi";

type Props = {
  tab: number;
  token: string;
  requestedTerminalId?: string | null;
  requestedTerminalRequestKey?: number;
};

type Activity = {
  id: string;
  kind: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ActivityLogEntry = {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
};

type Session = {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  targetCluster?: string;
  targetNamespace?: string;
  targetResource?: string;
  targetContainer?: string;
};

export default function ActivityTabs({
  tab,
  token,
  requestedTerminalId,
  requestedTerminalRequestKey,
}: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsErr, setLogsErr] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsErr, setSessionsErr] = useState<string | null>(null);

  const [openTerminalIds, setOpenTerminalIds] = useState<string[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const reloadActivities = useCallback(() => {
    setLoading(true);
    setErr(null);
    apiGet<{ items: Activity[] }>("/api/activity", token)
      .then((res) => {
        setActivities(res.items || []);
      })
      .catch((e) => {
        // For Phase 1 keep error handling simple; Activity Panel is additive.
        setErr(String(e));
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (tab !== 0) return;
    reloadActivities();
    const id = window.setInterval(reloadActivities, 5000);
    return () => window.clearInterval(id);
  }, [tab, reloadActivities]);

  const reloadSessions = useCallback(() => {
    setSessionsLoading(true);
    setSessionsErr(null);
    apiGet<{ items: Session[] }>("/api/sessions", token)
      .then((res) => {
        setSessions(res.items || []);
      })
      .catch((e) => {
        setSessionsErr(String(e));
      })
      .finally(() => setSessionsLoading(false));
  }, [token]);

  useEffect(() => {
    if (tab !== 1) return;
    reloadSessions();
    const id = window.setInterval(reloadSessions, 5000);
    return () => window.clearInterval(id);
  }, [tab, reloadSessions]);

  useEffect(() => {
    if (!requestedTerminalId) return;
    setOpenTerminalIds((prev) =>
      prev.includes(requestedTerminalId) ? prev : [...prev, requestedTerminalId]
    );
    setActiveTerminalId(requestedTerminalId);
    setFocusNonce((n) => n + 1);
    reloadSessions();
  }, [requestedTerminalId, requestedTerminalRequestKey, reloadSessions]);

  useEffect(() => {
    if (openTerminalIds.length === 0) {
      if (activeTerminalId !== null) {
        setActiveTerminalId(null);
      }
      return;
    }
    if (!activeTerminalId || !openTerminalIds.includes(activeTerminalId)) {
      setActiveTerminalId(openTerminalIds[0]);
    }
  }, [openTerminalIds, activeTerminalId]);

  const sessionsById = useMemo(() => {
    const map = new Map<string, Session>();
    sessions.forEach((s) => map.set(s.id, s));
    return map;
  }, [sessions]);
  const terminalSessions = useMemo(
    () => sessions.filter((s) => s.type === "terminal"),
    [sessions]
  );

  const terminateSession = async (id: string) => {
    await apiDelete(`/api/sessions/${encodeURIComponent(id)}`, token);
    setOpenTerminalIds((prev) => prev.filter((item) => item !== id));
    setActiveTerminalId((prev) => (prev === id ? null : prev));
    reloadSessions();
    reloadActivities();
  };

  useEffect(() => {
    if (tab !== 2) return;

    const loadOnce = () => {
      setLogsLoading(true);
      setLogsErr(null);
      apiGet<{ items: ActivityLogEntry[] }>("/api/activity/runtime/logs", token)
        .then((res) => {
          setLogs(res.items || []);
        })
        .catch((e) => {
          setLogsErr(String(e));
        })
        .finally(() => setLogsLoading(false));
    };

    loadOnce();
    const id = window.setInterval(loadOnce, 5000);
    return () => window.clearInterval(id);
  }, [tab, token]);

  useEffect(() => {
    const nextIds = terminalSessions.map((s) => s.id);
    setOpenTerminalIds(nextIds);
    setActiveTerminalId((prev) => {
      if (prev && nextIds.includes(prev)) {
        return prev;
      }
      return nextIds[0] || null;
    });
  }, [terminalSessions]);

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: tab === 0 ? "block" : "none", flex: 1, minHeight: 0, overflow: "auto" }}>
        <ActivityList items={activities} loading={loading} error={err || undefined} />
      </Box>
      <Box sx={{ display: tab === 1 ? "flex" : "none", flex: 1, minHeight: 0, flexDirection: "column", gap: 1 }}>
        {openTerminalIds.length > 0 && (
          <Box
            sx={{
              flexShrink: 0,
              border: "1px solid var(--border-subtle)",
              borderRadius: 1,
              bgcolor: "var(--bg-primary)",
            }}
          >
            <Tabs
              value={activeTerminalId && openTerminalIds.includes(activeTerminalId) ? openTerminalIds.indexOf(activeTerminalId) : false}
              onChange={(_, idx) => {
                const next = openTerminalIds[idx] || null;
                if (!next) return;
                setActiveTerminalId(next);
                setFocusNonce((n) => n + 1);
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, textTransform: "none", py: 0 } }}
            >
              {openTerminalIds.map((id) => {
                const info = sessionsById.get(id);
                const label = info?.title || id;
                return (
                  <Tab
                    key={id}
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="caption" sx={{ maxWidth: 220 }} noWrap>
                          {label}
                        </Typography>
                        {info?.status ? (
                          <Chip size="small" label={info.status} sx={{ height: 16, fontSize: "0.55rem", textTransform: "uppercase" }} />
                        ) : null}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void terminateSession(id);
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>
          </Box>
        )}

        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {openTerminalIds.length === 0 ? (
            <EmptyState message="Open a terminal session from the list below." />
          ) : (
            openTerminalIds.map((id) => (
              <Box key={id} sx={{ display: id === activeTerminalId ? "block" : "none", height: "100%" }}>
                <TerminalSessionView
                  id={id}
                  token={token}
                  session={sessionsById.get(id)}
                  active={id === activeTerminalId}
                  focusNonce={focusNonce}
                  onClose={() => {
                    void terminateSession(id);
                  }}
                />
              </Box>
            ))
          )}
        </Box>

        {sessionsLoading && (
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Refreshing sessions...
            </Typography>
          </Box>
        )}
        {!sessionsLoading && sessionsErr && (
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="error">
              Unable to refresh sessions.
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: tab === 2 ? "block" : "none", flex: 1, minHeight: 0, overflow: "auto" }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {logsLoading && <EmptyState message="Loading runtime logs…" />}
          {!logsLoading && logsErr && <EmptyState message="Failed to load runtime logs." />}
          {!logsLoading && !logsErr && logs.length === 0 && <EmptyState message="No runtime logs yet." />}
          {!logsLoading && !logsErr && logs.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                fontFamily: "monospace",
                fontSize: "0.75rem",
                py: 0.5,
              }}
            >
              {logs.map((log) => (
                <Box
                  key={log.id}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    px: 1,
                    py: 0.25,
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", minWidth: 150, flexShrink: 0 }}
                  >
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Typography>
                  <Chip
                    label={log.level.toUpperCase()}
                    size="small"
                    color={log.level === "error" ? "error" : log.level === "warn" ? "warning" : "default"}
                    sx={{ height: 18, fontSize: "0.6rem" }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", minWidth: 80, flexShrink: 0 }}
                  >
                    {log.source}
                  </Typography>
                  <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", flexGrow: 1 }}>
                    {log.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

