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
import PodDrawer from "./PodDrawer";

type DeploymentDetails = {
  summary: DeploymentSummary;
  conditions: DeploymentCondition[];
  rollout: DeploymentRollout;
  replicaSets: DeploymentReplicaSet[];
  pods: DeploymentPod[];
  spec: DeploymentSpec;
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

type DeploymentSummary = {
  name: string;
  namespace: string;
  strategy: string;
  selector: string;
  desired: number;
  current: number;
  ready: number;
  available: number;
  upToDate: number;
  ageSec: number;
};

type DeploymentCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: number;
};

type DeploymentRollout = {
  currentRevision?: string;
  observedGeneration: number;
  generation: number;
  progressDeadlineExceeded: boolean;
  lastRolloutStart?: number;
  lastRolloutComplete?: number;
  inProgress: boolean;
  warnings?: string[];
  missingReplicas: number;
  unavailableReplicas: number;
};

type DeploymentReplicaSet = {
  name: string;
  revision: number;
  desired: number;
  current: number;
  ready: number;
  ageSec: number;
  status: string;
  isActive: boolean;
  unhealthyPods: boolean;
};

type DeploymentPod = {
  name: string;
  phase: string;
  ready: string;
  restarts: number;
  node?: string;
  ageSec: number;
};

type DeploymentSpec = {
  podTemplate: {
    containers?: ContainerSummary[];
    initContainers?: ContainerSummary[];
    imagePullSecrets?: string[];
  };
  scheduling: {
    nodeSelector?: Record<string, string>;
    affinitySummary?: string;
    tolerations?: {
      key?: string;
      operator?: string;
      value?: string;
      effect?: string;
      seconds?: number;
    }[];
    topologySpreadConstraints?: {
      maxSkew: number;
      topologyKey?: string;
      whenUnsatisfiable?: string;
      labelSelector?: string;
    }[];
  };
  volumes?: { name: string; type?: string; source?: string }[];
  metadata: {
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
};

type ContainerSummary = {
  name: string;
  image?: string;
  cpuRequest?: string;
  cpuLimit?: string;
  memoryRequest?: string;
  memoryLimit?: string;
};

function fmtTs(unix: number) {
  if (!unix) return "";
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
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

function valueOrDash(val?: string | number | null) {
  if (val === undefined || val === null || val === "") return "-";
  return String(val);
}

function fmtAge(seconds?: number) {
  if (!seconds || seconds < 0) return "-";
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return `${seconds}s`;
  const hours = Math.floor(mins / 60);
  if (hours < 1) return `${mins}m`;
  const days = Math.floor(hours / 24);
  if (days < 1) return `${hours}h`;
  return `${days}d`;
}

function isConditionHealthy(cond: DeploymentCondition) {
  if (cond.type === "ReplicaFailure") {
    return cond.status !== "True";
  }
  return cond.status === "True";
}

function conditionStatusColor(status: string): "success" | "warning" | "error" | "default" {
  if (status === "True") return "success";
  if (status === "False") return "error";
  if (status === "Unknown") return "warning";
  return "default";
}

function podPhaseChipColor(phase: string): "success" | "warning" | "error" | "default" {
  switch (phase) {
    case "Running":
      return "success";
    case "Pending":
      return "warning";
    case "Failed":
      return "error";
    case "Succeeded":
      return "default";
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
  const [drawerPod, setDrawerPod] = useState<string | null>(null);

  const ns = props.namespace;
  const name = props.deploymentName;

  // Load deployment details + events when opened
  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setDrawerPod(null);
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
  const hasUnhealthyConditions = (details?.conditions || []).some((c) => !isConditionHealthy(c));
  const rollout = details?.rollout;
  const rolloutNeedsAttention =
    !!rollout &&
    (rollout.progressDeadlineExceeded ||
      rollout.inProgress ||
      rollout.missingReplicas > 0 ||
      rollout.unavailableReplicas > 0 ||
      (rollout.warnings || []).length > 0);

  const summaryItems = useMemo(
    () => [
      { label: "Desired replicas", value: valueOrDash(summary?.desired) },
      { label: "Updated replicas", value: valueOrDash(summary?.upToDate) },
      { label: "Ready replicas", value: valueOrDash(summary?.ready) },
      { label: "Available replicas", value: valueOrDash(summary?.available) },
      { label: "Strategy", value: valueOrDash(summary?.strategy) },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      { label: "Age", value: fmtAge(summary?.ageSec) },
      { label: "Selector", value: valueOrDash(summary?.selector) },
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
              <Tab label="Overview" />
              <Tab label="Rollout" />
              <Tab label="Pods" />
              <Tab label="Spec" />
              <Tab label="Events" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OVERVIEW */}
              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.5 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1.5 }}>
                      {summaryItems.map((item) => (
                        <Box key={item.label}>
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography variant="body2" sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Accordion defaultExpanded={hasUnhealthyConditions}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Conditions & Health</Typography>
                      {hasUnhealthyConditions && (
                        <Chip size="small" color="error" label="Unhealthy" sx={{ ml: 1 }} />
                      )}
                    </AccordionSummary>
                    <AccordionDetails>
                      {(details?.conditions || []).length === 0 ? (
                        <Typography variant="body2">No conditions reported.</Typography>
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
                            {(details?.conditions || []).map((c) => {
                              const unhealthy = !isConditionHealthy(c);
                              return (
                                <TableRow
                                  key={c.type}
                                  sx={{
                                    backgroundColor: unhealthy ? "rgba(211, 47, 47, 0.08)" : "transparent",
                                  }}
                                >
                                  <TableCell>{c.type}</TableCell>
                                  <TableCell>
                                    <Chip size="small" label={c.status} color={conditionStatusColor(c.status)} />
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

                  <Accordion defaultExpanded={!!rollout && (rollout.inProgress || rollout.progressDeadlineExceeded)}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Rollout Summary</Typography>
                      {!!rollout && rollout.progressDeadlineExceeded && (
                        <Chip size="small" color="error" label="Deadline Exceeded" sx={{ ml: 1 }} />
                      )}
                      {!!rollout && rollout.inProgress && !rollout.progressDeadlineExceeded && (
                        <Chip size="small" color="warning" label="In progress" sx={{ ml: 1 }} />
                      )}
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Current Revision
                          </Typography>
                          <Typography variant="body2">{valueOrDash(rollout?.currentRevision)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Observed / Spec Generation
                          </Typography>
                          <Typography variant="body2">
                            {valueOrDash(rollout?.observedGeneration)} / {valueOrDash(rollout?.generation)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Progress Deadline
                          </Typography>
                          <Typography variant="body2">
                            {rollout?.progressDeadlineExceeded ? "Exceeded" : "OK"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Last Rollout Start
                          </Typography>
                          <Typography variant="body2">
                            {rollout?.lastRolloutStart ? fmtTs(rollout.lastRolloutStart) : "-"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Last Rollout Complete
                          </Typography>
                          <Typography variant="body2">
                            {rollout?.lastRolloutComplete ? fmtTs(rollout.lastRolloutComplete) : "-"}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {/* ROLLOUT */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">ReplicaSets</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {(details?.replicaSets || []).length === 0 ? (
                        <Typography variant="body2">No ReplicaSets found for this Deployment.</Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Revision</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Desired</TableCell>
                              <TableCell>Current</TableCell>
                              <TableCell>Ready</TableCell>
                              <TableCell>Age</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(details?.replicaSets || []).map((rs) => (
                              <TableRow
                                key={rs.name}
                                sx={{
                                  backgroundColor: rs.unhealthyPods ? "rgba(255, 152, 0, 0.12)" : "transparent",
                                }}
                              >
                                <TableCell>{rs.revision}</TableCell>
                                <TableCell>{rs.name}</TableCell>
                                <TableCell>{rs.desired}</TableCell>
                                <TableCell>{rs.current}</TableCell>
                                <TableCell>{rs.ready}</TableCell>
                                <TableCell>{fmtAge(rs.ageSec)}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
                                    <Chip
                                      size="small"
                                      label={rs.status}
                                      color={rs.status === "Active" ? "success" : "default"}
                                    />
                                    {rs.isActive && <Chip size="small" label="Current" color="primary" />}
                                    {rs.unhealthyPods && <Chip size="small" label="Unhealthy Pods" color="warning" />}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  <Accordion defaultExpanded={rolloutNeedsAttention}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Rollout Diagnostics</Typography>
                      {rolloutNeedsAttention && <Chip size="small" color="warning" label="Attention" sx={{ ml: 1 }} />}
                    </AccordionSummary>
                    <AccordionDetails>
                      {!rollout ? (
                        <Typography variant="body2">No rollout diagnostics available.</Typography>
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {rollout.progressDeadlineExceeded && (
                              <Chip size="small" color="error" label="ProgressDeadlineExceeded" />
                            )}
                            {rollout.missingReplicas > 0 && (
                              <Chip size="small" color="warning" label={`Missing replicas: ${rollout.missingReplicas}`} />
                            )}
                            {rollout.unavailableReplicas > 0 && (
                              <Chip
                                size="small"
                                color="warning"
                                label={`Unavailable replicas: ${rollout.unavailableReplicas}`}
                              />
                            )}
                            {rollout.inProgress && <Chip size="small" color="info" label="Rollout in progress" />}
                          </Box>
                          {(rollout.warnings || []).length === 0 ? (
                            <Typography variant="body2">No warnings reported.</Typography>
                          ) : (
                            (rollout.warnings || []).map((w, idx) => (
                              <Typography key={`${w}-${idx}`} variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                {w}
                              </Typography>
                            ))
                          )}
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {/* PODS */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {(details?.pods || []).length === 0 ? (
                    <Typography variant="body2">No pods found for this Deployment.</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Pod</TableCell>
                          <TableCell>Phase</TableCell>
                          <TableCell>Ready</TableCell>
                          <TableCell>Restarts</TableCell>
                          <TableCell>Node</TableCell>
                          <TableCell>Age</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(details?.pods || []).map((p) => (
                          <TableRow
                            key={p.name}
                            hover
                            onClick={() => setDrawerPod(p.name)}
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell>{p.name}</TableCell>
                            <TableCell>
                              <Chip size="small" label={p.phase} color={podPhaseChipColor(p.phase)} />
                            </TableCell>
                            <TableCell>{p.ready}</TableCell>
                            <TableCell>{p.restarts}</TableCell>
                            <TableCell>{valueOrDash(p.node)}</TableCell>
                            <TableCell>{fmtAge(p.ageSec)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* SPEC */}
              {tab === 3 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "100%", overflow: "auto" }}>
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Pod Template Summary</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="caption" color="text.secondary">
                        Containers
                      </Typography>
                      {(details?.spec?.podTemplate?.containers || []).length === 0 ? (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          No containers defined.
                        </Typography>
                      ) : (
                        <Table size="small" sx={{ mt: 0.5 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell>Image</TableCell>
                              <TableCell>CPU Req/Lim</TableCell>
                              <TableCell>Memory Req/Lim</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(details?.spec?.podTemplate?.containers || []).map((c) => (
                              <TableRow key={c.name}>
                                <TableCell>{c.name}</TableCell>
                                <TableCell sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                                  {valueOrDash(c.image)}
                                </TableCell>
                                <TableCell>
                                  {valueOrDash(c.cpuRequest)} / {valueOrDash(c.cpuLimit)}
                                </TableCell>
                                <TableCell>
                                  {valueOrDash(c.memoryRequest)} / {valueOrDash(c.memoryLimit)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Init Containers
                        </Typography>
                        {(details?.spec?.podTemplate?.initContainers || []).length === 0 ? (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            No init containers.
                          </Typography>
                        ) : (
                          <Table size="small" sx={{ mt: 0.5 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Image</TableCell>
                                <TableCell>CPU Req/Lim</TableCell>
                                <TableCell>Memory Req/Lim</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(details?.spec?.podTemplate?.initContainers || []).map((c) => (
                                <TableRow key={c.name}>
                                  <TableCell>{c.name}</TableCell>
                                  <TableCell sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                                    {valueOrDash(c.image)}
                                  </TableCell>
                                  <TableCell>
                                    {valueOrDash(c.cpuRequest)} / {valueOrDash(c.cpuLimit)}
                                  </TableCell>
                                  <TableCell>
                                    {valueOrDash(c.memoryRequest)} / {valueOrDash(c.memoryLimit)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Image Pull Secrets
                        </Typography>
                        {(details?.spec?.podTemplate?.imagePullSecrets || []).length === 0 ? (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            No image pull secrets.
                          </Typography>
                        ) : (
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                            {(details?.spec?.podTemplate?.imagePullSecrets || []).map((s) => (
                              <Chip key={s} size="small" label={s} />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Scheduling & Placement</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Affinity
                          </Typography>
                          <Typography variant="body2">
                            {valueOrDash(details?.spec?.scheduling?.affinitySummary)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Node Selectors
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(details?.spec?.scheduling?.nodeSelector || {}).length === 0 ? (
                            <Typography variant="body2">None</Typography>
                          ) : (
                            Object.entries(details?.spec?.scheduling?.nodeSelector || {}).map(([k, v]) => (
                              <Chip key={k} size="small" label={`${k}=${v}`} />
                            ))
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Tolerations
                        </Typography>
                        {(details?.spec?.scheduling?.tolerations || []).length === 0 ? (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            None
                          </Typography>
                        ) : (
                          <Table size="small" sx={{ mt: 0.5 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Key</TableCell>
                                <TableCell>Operator</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Effect</TableCell>
                                <TableCell>Seconds</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(details?.spec?.scheduling?.tolerations || []).map((t, idx) => (
                                <TableRow key={`${t.key}-${idx}`}>
                                  <TableCell>{valueOrDash(t.key)}</TableCell>
                                  <TableCell>{valueOrDash(t.operator)}</TableCell>
                                  <TableCell>{valueOrDash(t.value)}</TableCell>
                                  <TableCell>{valueOrDash(t.effect)}</TableCell>
                                  <TableCell>{t.seconds !== undefined ? t.seconds : "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Topology Spread Constraints
                        </Typography>
                        {(details?.spec?.scheduling?.topologySpreadConstraints || []).length === 0 ? (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            None
                          </Typography>
                        ) : (
                          <Table size="small" sx={{ mt: 0.5 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Topology Key</TableCell>
                                <TableCell>Max Skew</TableCell>
                                <TableCell>When Unsatisfiable</TableCell>
                                <TableCell>Label Selector</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(details?.spec?.scheduling?.topologySpreadConstraints || []).map((t, idx) => (
                                <TableRow key={`${t.topologyKey}-${idx}`}>
                                  <TableCell>{valueOrDash(t.topologyKey)}</TableCell>
                                  <TableCell>{t.maxSkew}</TableCell>
                                  <TableCell>{valueOrDash(t.whenUnsatisfiable)}</TableCell>
                                  <TableCell>{valueOrDash(t.labelSelector)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Volumes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {(details?.spec?.volumes || []).length === 0 ? (
                        <Typography variant="body2">No volumes defined.</Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Source</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(details?.spec?.volumes || []).map((v) => (
                              <TableRow key={v.name}>
                                <TableCell>{v.name}</TableCell>
                                <TableCell>{valueOrDash(v.type)}</TableCell>
                                <TableCell>{valueOrDash(v.source)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Metadata</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="caption" color="text.secondary">
                        Labels
                      </Typography>
                      {Object.entries(details?.spec?.metadata?.labels || {}).length === 0 ? (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          No labels.
                        </Typography>
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(details?.spec?.metadata?.labels || {}).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}=${v}`} />
                          ))}
                        </Box>
                      )}

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Annotations
                        </Typography>
                        {Object.entries(details?.spec?.metadata?.annotations || {}).length === 0 ? (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            No annotations.
                          </Typography>
                        ) : (
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                            {Object.entries(details?.spec?.metadata?.annotations || {}).map(([k, v]) => (
                              <Chip key={k} size="small" label={`${k}=${v}`} />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {/* EVENTS */}
              {tab === 4 && (
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
              {tab === 5 && (
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
              namespace={ns}
              podName={drawerPod}
            />
          </>
        )}
      </Box>
    </Drawer>
  );
}
