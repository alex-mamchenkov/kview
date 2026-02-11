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
  TableBody,
  TableRow,
  TableCell,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { apiGet } from "../api";
import { useConnectionState } from "../connectionState";
import { fmtTs, valueOrDash } from "../utils/format";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";

type HelmHook = {
  name: string;
  kind: string;
  events: string[];
  weight: number;
  deletePolicies?: string[];
};

type HelmReleaseDetails = {
  summary: HelmReleaseSummary;
  history: HelmReleaseRevision[];
  notes?: string;
  values?: string;
  manifest?: string;
  hooks?: HelmHook[];
  yaml?: string;
};

type HelmReleaseSummary = {
  name: string;
  namespace: string;
  status: string;
  revision: number;
  updated: number;
  chart: string;
  chartName: string;
  chartVersion: string;
  appVersion: string;
  storageBackend: string;
  description?: string;
  firstDeployed?: number;
  lastDeployed?: number;
};

type HelmReleaseRevision = {
  revision: number;
  status: string;
  updated: number;
  chart: string;
  chartVersion: string;
  appVersion: string;
  description?: string;
};

type ChipColor = "success" | "warning" | "error" | "default";

function helmStatusChipColor(status?: string | null): ChipColor {
  switch (status) {
    case "deployed":
      return "success";
    case "superseded":
      return "default";
    case "failed":
      return "error";
    case "pending-install":
    case "pending-upgrade":
    case "pending-rollback":
    case "uninstalling":
      return "warning";
    case "unknown":
      return "warning";
    default:
      return "default";
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="small"
      startIcon={<ContentCopyIcon />}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      sx={{ mb: 1 }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function MonospaceBlock({ text }: { text: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <CopyButton text={text} />
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          bgcolor: "#f5f5f5",
          p: 1.5,
          borderRadius: 1,
          border: "1px solid #e0e0e0",
        }}
      >
        {text}
      </Box>
    </Box>
  );
}

export default function HelmReleaseDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  releaseName: string | null;
}) {
  const { retryNonce } = useConnectionState();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<HelmReleaseDetails | null>(null);
  const [err, setErr] = useState("");

  const ns = props.namespace;
  const name = props.releaseName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr("");
    setDetails(null);
    setLoading(true);

    (async () => {
      const det = await apiGet<any>(
        `/api/namespaces/${encodeURIComponent(ns)}/helmreleases/${encodeURIComponent(name)}`,
        props.token,
      );
      const item: HelmReleaseDetails | null = det?.item ?? null;
      setDetails(item);
    })()
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token, retryNonce]);

  const summary = details?.summary;
  const history = details?.history || [];
  const notes = details?.notes || "";
  const values = details?.values || "";
  const manifest = details?.manifest || "";
  const hooks = details?.hooks || [];
  const yaml = details?.yaml || "";

  // Build tab labels dynamically, hiding empty optional tabs.
  const tabDefs = useMemo(() => {
    const tabs: { label: string; id: string }[] = [{ label: "Overview", id: "overview" }];
    if (values.trim()) tabs.push({ label: "Values", id: "values" });
    if (manifest.trim()) tabs.push({ label: "Manifest", id: "manifest" });
    if (hooks.length > 0) tabs.push({ label: "Hooks", id: "hooks" });
    tabs.push({ label: "History", id: "history" });
    if (notes.trim()) tabs.push({ label: "Notes", id: "notes" });
    if (yaml.trim()) tabs.push({ label: "YAML", id: "yaml" });
    return tabs;
  }, [values, manifest, hooks, notes, yaml]);

  const activeTabId = tabDefs[tab]?.id || "overview";

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      {
        label: "Status",
        value: valueOrDash(summary?.status),
        chip: true,
        chipColor: helmStatusChipColor(summary?.status),
      },
      { label: "Revision", value: valueOrDash(summary?.revision) },
      { label: "Chart", value: valueOrDash(summary?.chart) },
      { label: "Chart Version", value: valueOrDash(summary?.chartVersion) },
      { label: "App Version", value: valueOrDash(summary?.appVersion) },
      { label: "Storage", value: valueOrDash(summary?.storageBackend) },
      { label: "First Deployed", value: summary?.firstDeployed ? fmtTs(summary.firstDeployed) : "-" },
      { label: "Last Deployed", value: summary?.lastDeployed ? fmtTs(summary.lastDeployed) : "-" },
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
            Helm Release: {name || "-"}{" "}
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
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              {tabDefs.map((t) => (
                <Tab key={t.id} label={t.label} />
              ))}
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OVERVIEW */}
              {activeTabId === "overview" && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    height: "100%",
                    overflow: "auto",
                  }}
                >
                  <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 1.5 }}>
                    <KeyValueTable rows={summaryItems} columns={3} />
                  </Box>

                  {summary?.description && (
                    <Section title="Description">
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                        {summary.description}
                      </Typography>
                    </Section>
                  )}
                </Box>
              )}

              {/* VALUES */}
              {activeTabId === "values" && (
                <MonospaceBlock text={values} />
              )}

              {/* MANIFEST */}
              {activeTabId === "manifest" && (
                <MonospaceBlock text={manifest} />
              )}

              {/* HOOKS */}
              {activeTabId === "hooks" && (
                <Box sx={{ height: "100%", overflow: "auto" }}>
                  {hooks.length === 0 ? (
                    <EmptyState message="No hooks found." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Kind</TableCell>
                          <TableCell>Events</TableCell>
                          <TableCell>Weight</TableCell>
                          <TableCell>Delete Policies</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {hooks.map((hook, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                              {valueOrDash(hook.name)}
                            </TableCell>
                            <TableCell>{valueOrDash(hook.kind)}</TableCell>
                            <TableCell>
                              {hook.events?.length
                                ? hook.events.map((e) => (
                                    <Chip key={e} size="small" label={e} sx={{ mr: 0.5, mb: 0.5 }} />
                                  ))
                                : "-"}
                            </TableCell>
                            <TableCell>{hook.weight}</TableCell>
                            <TableCell>
                              {hook.deletePolicies?.length
                                ? hook.deletePolicies.join(", ")
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* HISTORY */}
              {activeTabId === "history" && (
                <Box sx={{ height: "100%", overflow: "auto" }}>
                  {history.length === 0 ? (
                    <EmptyState message="No revision history found." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Revision</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Chart</TableCell>
                          <TableCell>App Version</TableCell>
                          <TableCell>Updated</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map((rev) => (
                          <TableRow key={rev.revision}>
                            <TableCell>{rev.revision}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={valueOrDash(rev.status)}
                                color={helmStatusChipColor(rev.status)}
                              />
                            </TableCell>
                            <TableCell>{valueOrDash(rev.chart)}</TableCell>
                            <TableCell>{valueOrDash(rev.appVersion)}</TableCell>
                            <TableCell>{fmtTs(rev.updated)}</TableCell>
                            <TableCell>{valueOrDash(rev.description)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* NOTES */}
              {activeTabId === "notes" && (
                <MonospaceBlock text={notes} />
              )}

              {/* YAML */}
              {activeTabId === "yaml" && (
                <MonospaceBlock text={yaml} />
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
