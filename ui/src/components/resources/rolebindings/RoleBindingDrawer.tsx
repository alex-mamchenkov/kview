import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
} from "@mui/material";
import { apiGet, toApiError, type ApiError } from "../../../api";
import { useConnectionState } from "../../../connectionState";
import { fmtAge, fmtTs, valueOrDash } from "../../../utils/format";
import KeyValueTable from "../../shared/KeyValueTable";
import AccessDeniedState from "../../shared/AccessDeniedState";
import EmptyState from "../../shared/EmptyState";
import ErrorState from "../../shared/ErrorState";
import AttentionSummary, {
  type AttentionHealth,
  type AttentionReason,
} from "../../shared/AttentionSummary";
import EventsList from "../../shared/EventsList";
import CodeBlock from "../../shared/CodeBlock";
import Section from "../../shared/Section";
import RoleDrawer from "../roles/RoleDrawer";
import ClusterRoleDrawer from "../clusterroles/ClusterRoleDrawer";
import RoleBindingActions from "./RoleBindingActions";
import RightDrawer from "../../layout/RightDrawer";
import ResourceDrawerShell from "../../shared/ResourceDrawerShell";
import type { ApiItemResponse, ApiListResponse, DashboardSignalItem } from "../../../types/api";
import useResourceSignals from "../../../utils/useResourceSignals";
import type { SxProps, Theme } from "@mui/material/styles";
import { drawerBodySx, drawerTabContentSx, panelBoxSx } from "../../../theme/sxTokens";

type RoleBindingDetails = {
  summary: BindingSummary;
  roleRef: RoleRef;
  subjects: Subject[];
  yaml: string;
};

type BindingSummary = {
  name: string;
  namespace: string;
  createdAt?: number;
  ageSec?: number;
};

type RoleRef = {
  kind: string;
  name: string;
  apiGroup: string;
};

type Subject = {
  kind: string;
  name: string;
  namespace?: string;
};

type EventDTO = {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
};

export default function RoleBindingDrawer(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  namespace: string;
  roleBindingName: string | null;
}) {
  const { retryNonce } = useConnectionState();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<RoleBindingDetails | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [err, setErr] = useState<ApiError | null>(null);
  const [drawerRole, setDrawerRole] = useState<string | null>(null);
  const [drawerClusterRole, setDrawerClusterRole] = useState<string | null>(null);

  const ns = props.namespace;
  const name = props.roleBindingName;

  useEffect(() => {
    if (!props.open || !name) return;

    setTab(0);
    setErr(null);
    setDetails(null);
    setEvents([]);
    setDrawerRole(null);
    setDrawerClusterRole(null);
    setLoading(true);

    (async () => {
      const det = await apiGet<ApiItemResponse<RoleBindingDetails>>(
        `/api/namespaces/${encodeURIComponent(ns)}/rolebindings/${encodeURIComponent(name)}`,
        props.token
      );
      const item: RoleBindingDetails | null = det?.item ?? null;
      setDetails(item);

      const ev = await apiGet<ApiListResponse<EventDTO>>(
        `/api/namespaces/${encodeURIComponent(ns)}/rolebindings/${encodeURIComponent(name)}/events`,
        props.token
      );
      setEvents(ev?.items || []);
    })()
      .catch((e) => setErr(toApiError(e)))
      .finally(() => setLoading(false));
  }, [props.open, name, ns, props.token, retryNonce]);

  const summary = details?.summary;
  const roleRef = details?.roleRef;
  const subjects = details?.subjects || [];
  const accessDenied = err?.status === 401 || err?.status === 403;
  const resourceSignals = useResourceSignals({
    token: props.token,
    scope: "namespace",
    namespace: ns,
    kind: "rolebindings",
    name: name || "",
    enabled: !!props.open && !!name && !accessDenied,
    refreshKey: retryNonce,
  });

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: valueOrDash(summary?.name), monospace: true },
      { label: "Namespace", value: valueOrDash(summary?.namespace) },
      { label: "Age", value: fmtAge(summary?.ageSec) },
      { label: "Created", value: summary?.createdAt ? fmtTs(summary.createdAt) : "-" },
    ],
    [summary]
  );
  const roleBindingSignals = useMemo<DashboardSignalItem[]>(
    () => resourceSignals.signals || [],
    [resourceSignals.signals],
  );

  const attentionHealth = useMemo<AttentionHealth | undefined>(() => {
    if (!roleRef) return undefined;
    return {
      label: `RoleRef: ${roleRef.kind || "-"} / ${roleRef.name || "-"}`,
      tone: roleRef.name ? "success" : "warning",
      tooltip: `Subjects ${subjects.length}`,
    };
  }, [roleRef, subjects.length]);

  const attentionReasons = useMemo<AttentionReason[]>(() => {
    const reasons: AttentionReason[] = [];
    if (subjects.length === 0) {
      reasons.push({ label: "No subjects bound", severity: "warning" });
    }
    if (!roleRef?.name) {
      reasons.push({ label: "RoleRef name is missing", severity: "warning" });
    }
    return reasons;
  }, [subjects.length, roleRef?.name]);

  const warningEvents = useMemo(
    () => events.filter((e) => String(e.type).toLowerCase() === "warning").slice(0, 5),
    [events],
  );

  function openRoleRef() {
    if (!roleRef?.kind || !roleRef?.name) return;
    if (roleRef.kind === "Role") {
      setDrawerRole(roleRef.name);
      return;
    }
    if (roleRef.kind === "ClusterRole") {
      setDrawerClusterRole(roleRef.name);
    }
  }

  const canOpenRoleRef = roleRef?.kind === "Role" || roleRef?.kind === "ClusterRole";

  return (
    <RightDrawer open={props.open} onClose={props.onClose}>
      <ResourceDrawerShell
        title={
          <>
            RoleBinding: {name || "-"}{" "}
            <Typography component="span" variant="body2">
              ({ns})
            </Typography>
          </>
        }
        onClose={props.onClose}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : accessDenied ? (
          <AccessDeniedState status={err?.status} resourceLabel="Role Bindings" />
        ) : err ? (
          <ErrorState message={err.message} />
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Overview" />
              <Tab label="Subjects" />
              <Tab label="Role Ref" />
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
                      <RoleBindingActions
                        token={props.token}
                        namespace={ns}
                        roleBindingName={name}
                        onDeleted={props.onClose}
                      />
                    </Section>
                  )}

                  <AttentionSummary
                    health={attentionHealth}
                    reasons={attentionReasons}
                    signals={roleBindingSignals}
                    onJumpToEvents={() => setTab(3)}
                  />

                  <Section title="Recent Warning events">
                    <Box sx={panelBoxSx}>
                      <EventsList events={warningEvents} emptyMessage="No recent warning events." />
                    </Box>
                  </Section>
                </Box>
              )}

              {/* SUBJECTS */}
              {tab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", overflow: "auto" }}>
                  {subjects.length === 0 ? (
                    <EmptyState message="No subjects defined for this RoleBinding." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Kind</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Namespace</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {subjects.map((s, idx) => (
                          <TableRow key={`${s.kind || "subject"}-${s.name || idx}`}>
                            <TableCell>{valueOrDash(s.kind)}</TableCell>
                            <TableCell>{valueOrDash(s.name)}</TableCell>
                            <TableCell>{valueOrDash(s.namespace)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* ROLE REF */}
              {tab === 2 && (
                <Box sx={drawerTabContentSx}>
                  <Box sx={panelBoxSx}>
                    <KeyValueTable
                      rows={[
                        { label: "Kind", value: valueOrDash(roleRef?.kind) },
                        { label: "Name", value: valueOrDash(roleRef?.name), monospace: true },
                        { label: "API Group", value: valueOrDash(roleRef?.apiGroup) },
                      ]}
                      columns={3}
                    />
                  </Box>
                  <Box>
                    <Button variant="outlined" onClick={openRoleRef} disabled={!canOpenRoleRef}>
                      Open Role Ref
                    </Button>
                  </Box>
                </Box>
              )}

              {/* EVENTS */}
              {tab === 3 && (
                <Box sx={[drawerTabContentSx, { gap: 1 }] as SxProps<Theme>}>
                  <EventsList events={events} emptyMessage="No events found for this RoleBinding." />
                </Box>
              )}

              {/* METADATA */}
              {tab === 4 && (
                <Box sx={drawerTabContentSx}>
                  <Box sx={panelBoxSx}>
                    <KeyValueTable rows={summaryItems} columns={3} />
                  </Box>
                </Box>
              )}

              {/* YAML */}
              {tab === 5 && (
                <CodeBlock code={details?.yaml || ""} language="yaml" />
              )}
            </Box>
          </>
        )}
      </ResourceDrawerShell>

      <RoleDrawer
        open={!!drawerRole}
        onClose={() => setDrawerRole(null)}
        token={props.token}
        namespace={ns}
        roleName={drawerRole}
      />
      <ClusterRoleDrawer
        open={!!drawerClusterRole}
        onClose={() => setDrawerClusterRole(null)}
        token={props.token}
        clusterRoleName={drawerClusterRole}
      />
    </RightDrawer>
  );
}
