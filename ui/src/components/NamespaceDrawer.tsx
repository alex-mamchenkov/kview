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
import { useConnectionState } from "../connectionState";
import { fmtAge, fmtTs, valueOrDash } from "../utils/format";
import { namespacePhaseChipColor } from "../utils/k8sUi";
import KeyValueTable from "./shared/KeyValueTable";
import EmptyState from "./shared/EmptyState";
import ErrorState from "./shared/ErrorState";
import Section from "./shared/Section";
import MetadataSection from "./shared/MetadataSection";
import ConditionsTable from "./shared/ConditionsTable";
import CodeBlock from "./shared/CodeBlock";

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
  const { retryNonce } = useConnectionState();
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
  }, [props.open, name, props.token, retryNonce]);

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

                  <MetadataSection labels={metadata?.labels} annotations={metadata?.annotations} />
                </Box>
              )}

              {/* CONDITIONS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  <ConditionsTable
                    conditions={conditions}
                    isHealthy={isNamespaceConditionHealthy}
                    chipColor={(cond) => namespaceConditionChipColor(cond.status)}
                    title="Namespace Conditions"
                  />
                </Box>
              )}

              {/* YAML */}
              {tab === 2 && (
                <CodeBlock code={details?.yaml || ""} language="yaml" />
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
