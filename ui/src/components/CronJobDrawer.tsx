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
import JobDrawer from "./JobDrawer";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { eventChipColor } from "../utils/k8sUi";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";
import Section from "./shared/Section";

type CronJobDetails = {
  summary: CronJobSummary;
  policy: CronJobPolicy;
  activeJobs?: CronJobJob[];
  recentJobs?: CronJobJob[];
  linkedJobs?: CronJobJobsSummary;
  spec: CronJobSpec;
  metadata: CronJobMetadata;
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

type CronJobSummary = {
  name: string;
  namespace: string;
  schedule: string;
  timeZone?: string;
  concurrencyPolicy?: string;
  suspend: boolean;
  active: number;
  lastScheduleTime?: number;
  lastSuccessfulTime?: number;
  ageSec: number;
};

type CronJobPolicy = {
  startingDeadlineSeconds?: number;
  successfulJobsHistoryLimit?: number;
  failedJobsHistoryLimit?: number;
};

type CronJobJob = {
  name: string;
  startTime?: number;
};

type CronJobJobsSummary = {
  total: number;
};

type CronJobSpec = {
  jobTemplate: {
    containers?: ContainerSummary[];
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
  };
  volumes?: { name: string; type?: string; source?: string }[];
  metadata: {
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
};

type CronJobMetadata = {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

type ContainerSummary = {
  name: string;
  image?: string;
  cpuRequest?: string;
  cpuLimit?: string;
  memoryRequest?: string;
  memoryLimit?: string;
};

function formatSuspend(suspend?: boolean) {
  if (suspend == null) return "-";
  const suspended = Boolean(suspend);
  return <Chip size="small" label={suspended ? "Yes" : "No"} color={suspended ? "warning" : "default"} />;
}

export default function CronJobDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  cronJobName: string | null;
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<CronJobDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState("");
  const [drawerJob, setDrawerJob] = useState<string | null>(null);

  const ns = props.namespace;
  const name = props.cronJobName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setEvents([]);
    setDrawerJob(null);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/cronjobs/${encodeURIComponent(name)}`,
        props.token
      );
      const item: CronJobDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/cronjobs/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token]);

  const summary = details?.summary;
  const policy = details?.policy;
  const activeJobs = details?.activeJobs || [];
  const recentJobsRaw = details?.recentJobs || [];
  const activeNames = useMemo(() => new Set(activeJobs.map((j) => j.name)), [activeJobs]);
  const recentJobs = useMemo(
    () => recentJobsRaw.filter((j) => j.name && !activeNames.has(j.name)),
    [recentJobsRaw, activeNames]
  );

  const hasPolicy =
    policy?.startingDeadlineSeconds != null ||
    policy?.successfulJobsHistoryLimit != null ||
    policy?.failedJobsHistoryLimit != null;

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name) },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      { label: "Schedule", value: valueOrDash(summary?.schedule) },
      { label: "Time Zone", value: valueOrDash(summary?.timeZone) },
      { label: "Concurrency Policy", value: valueOrDash(summary?.concurrencyPolicy) },
      { label: "Suspend", value: formatSuspend(summary?.suspend) },
      { label: "Active Jobs", value: valueOrDash(summary?.active) },
      { label: "Last Schedule", value: summary?.lastScheduleTime ? fmtTs(summary.lastScheduleTime) : "-" },
      { label: "Last Successful", value: summary?.lastSuccessfulTime ? fmtTs(summary.lastSuccessfulTime) : "-" },
      { label: "Age", value: fmtAge(summary?.ageSec) },
    ],
    [summary]
  );

  const jobRow = (j: CronJobJob, idx: number) => (
    <TableRow
      key={j.name || String(idx)}
      hover
      onClick={() => j.name && setDrawerJob(j.name)}
      sx={{ cursor: j.name ? "pointer" : "default" }}
    >
      <TableCell>{valueOrDash(j.name)}</TableCell>
      <TableCell>{j.startTime ? fmtTs(j.startTime) : "-"}</TableCell>
    </TableRow>
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
            CronJob: {name || "-"} <Typography component="span" variant="body2">({ns})</Typography>
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
              <Tab label="Jobs" />
              <Tab label="Spec" />
              <Tab label="Events" />
              <Tab label="YAML" />
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OVERVIEW */}
              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.5 }}>
                    <KeyValueTable
                      rows={summaryItems}
                      columns={3}
                      valueSx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                    />
                  </Box>

                  <Accordion defaultExpanded={hasPolicy}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Policy</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <KeyValueTable
                        columns={2}
                        rows={[
                          {
                            label: "Starting Deadline Seconds",
                            value: valueOrDash(policy?.startingDeadlineSeconds),
                          },
                          {
                            label: "Successful Jobs History Limit",
                            value: valueOrDash(policy?.successfulJobsHistoryLimit),
                          },
                          {
                            label: "Failed Jobs History Limit",
                            value: valueOrDash(policy?.failedJobsHistoryLimit),
                          },
                        ]}
                      />
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {/* JOBS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", overflow: "auto" }}>
                  {activeJobs.length === 0 && recentJobs.length === 0 ? (
                    <EmptyState message="No active or recent Jobs found for this CronJob." />
                  ) : (
                    <>
                      <Section title="Active Jobs" divider={false}>
                        {activeJobs.length === 0 ? (
                          <EmptyState message="No active Jobs." sx={{ mt: 1 }} />
                        ) : (
                          <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Job</TableCell>
                                <TableCell>Start Time</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>{activeJobs.map(jobRow)}</TableBody>
                          </Table>
                        )}
                      </Section>

                      <Section title="Recent Jobs" divider={false}>
                        {recentJobs.length === 0 ? (
                          <EmptyState message="No recent Jobs." sx={{ mt: 1 }} />
                        ) : (
                          <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Job</TableCell>
                                <TableCell>Start Time</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>{recentJobs.map(jobRow)}</TableBody>
                          </Table>
                        )}
                      </Section>
                    </>
                  )}
                </Box>
              )}

              {/* SPEC */}
              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "100%", overflow: "auto" }}>
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Job Template Summary</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="caption" color="text.secondary">
                        Containers
                      </Typography>
                      {(details?.spec?.jobTemplate?.containers || []).length === 0 ? (
                        <EmptyState message="No containers defined." sx={{ mt: 0.5 }} />
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
                            {(details?.spec?.jobTemplate?.containers || []).map((c, idx) => (
                              <TableRow key={c.name || String(idx)}>
                                <TableCell>{valueOrDash(c.name)}</TableCell>
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
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Scheduling & Placement</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <KeyValueTable
                        columns={2}
                        rows={[{ label: "Affinity", value: details?.spec?.scheduling?.affinitySummary }]}
                      />

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Node Selectors
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          {Object.entries(details?.spec?.scheduling?.nodeSelector || {}).length === 0 ? (
                            <EmptyState message="None" />
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
                          <EmptyState message="None" sx={{ mt: 0.5 }} />
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
                                <TableRow key={`${t.key || "tol"}-${idx}`}>
                                  <TableCell>{valueOrDash(t.key)}</TableCell>
                                  <TableCell>{valueOrDash(t.operator)}</TableCell>
                                  <TableCell>{valueOrDash(t.value)}</TableCell>
                                  <TableCell>{valueOrDash(t.effect)}</TableCell>
                                  <TableCell>{valueOrDash(t.seconds)}</TableCell>
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
                        <EmptyState message="No volumes defined." />
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell>Type</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(details?.spec?.volumes || []).map((v, idx) => (
                              <TableRow key={v.name || String(idx)}>
                                <TableCell>{valueOrDash(v.name)}</TableCell>
                                <TableCell>{valueOrDash(v.type)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Template Metadata</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="caption" color="text.secondary">
                        Labels
                      </Typography>
                      {Object.entries(details?.spec?.metadata?.labels || {}).length === 0 ? (
                        <EmptyState message="No labels." sx={{ mt: 0.5 }} />
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
                          <EmptyState message="No annotations." sx={{ mt: 0.5 }} />
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
              {tab === 3 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {events.length === 0 ? (
                    <EmptyState message="No events found for this CronJob." />
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
            <JobDrawer
              open={!!drawerJob}
              onClose={() => setDrawerJob(null)}
              token={props.token}
              namespace={ns}
              jobName={drawerJob}
            />
          </>
        )}
      </Box>
    </Drawer>
  );
}
