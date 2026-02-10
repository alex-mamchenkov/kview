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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { apiGet } from "../api";
import { useConnectionState } from "../connectionState";
import { fmtTs, valueOrDash } from "../utils/format";
import Section from "./shared/Section";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";

type HelmReleaseDetails = {
  summary: HelmReleaseSummary;
  history: HelmReleaseRevision[];
  notes?: string;
};

type HelmReleaseSummary = {
  name: string;
  namespace: string;
  status: string;
  revision: number;
  updated: number;
  chart: string;
  chartVersion: string;
  appVersion: string;
  storageBackend: string;
  description?: string;
  decodeError?: string;
};

type HelmReleaseRevision = {
  revision: number;
  status: string;
  updated: number;
  chart: string;
  chartVersion: string;
  appVersion: string;
  description?: string;
  decodeError?: string;
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

  const hasNotes = notes.trim().length > 0;
  const tabLabels = hasNotes ? ["Overview", "History", "Notes"] : ["Overview", "History"];

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
      { label: "Updated", value: summary?.updated ? fmtTs(summary.updated) : "-" },
      { label: "Chart", value: valueOrDash(summary?.chart) },
      { label: "Chart Version", value: valueOrDash(summary?.chartVersion) },
      { label: "App Version", value: valueOrDash(summary?.appVersion) },
      { label: "Storage", value: valueOrDash(summary?.storageBackend) },
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
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              {tabLabels.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>

            <Box sx={{ mt: 2, flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OVERVIEW */}
              {tab === 0 && (
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

                  {summary?.decodeError && (
                    <Section title="Decode Warning">
                      <Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>
                        {summary.decodeError}
                      </Typography>
                    </Section>
                  )}

                  {summary?.description && (
                    <Section title="Description">
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                        {summary.description}
                      </Typography>
                    </Section>
                  )}
                </Box>
              )}

              {/* HISTORY */}
              {tab === 1 && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    height: "100%",
                    overflow: "auto",
                  }}
                >
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
                              {rev.decodeError ? (
                                <Chip size="small" label="decode error" color="warning" />
                              ) : (
                                <Chip
                                  size="small"
                                  label={valueOrDash(rev.status)}
                                  color={helmStatusChipColor(rev.status)}
                                />
                              )}
                            </TableCell>
                            <TableCell>{valueOrDash(rev.chart)}</TableCell>
                            <TableCell>{valueOrDash(rev.appVersion)}</TableCell>
                            <TableCell>{fmtTs(rev.updated)}</TableCell>
                            <TableCell>
                              {rev.decodeError
                                ? rev.decodeError
                                : valueOrDash(rev.description)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* NOTES */}
              {hasNotes && tab === 2 && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    height: "100%",
                    overflow: "auto",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                  >
                    {notes}
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
