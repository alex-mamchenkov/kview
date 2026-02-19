import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { apiPostWithContext } from "../api";
import { useActiveContext } from "../activeContext";
import ActionButton from "./mutations/ActionButton";

type Capabilities = {
  delete: boolean;
  update: boolean;
  patch: boolean;
  create: boolean;
};

type Props = {
  token: string;
  namespace: string;
  daemonSetName: string;
  onRefresh: () => void;
  onDeleted: () => void;
};

export default function DaemonSetActions({
  token,
  namespace,
  daemonSetName,
  onRefresh,
  onDeleted,
}: Props) {
  const activeContext = useActiveContext();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    if (!activeContext || !daemonSetName) return;
    setCaps(null);
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group: "apps", resource: "daemonsets", namespace, name: daemonSetName },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps({ delete: false, update: false, patch: false, create: false }));
  }, [activeContext, token, namespace, daemonSetName]);

  const canRestart = caps ? caps.patch || caps.update : false;
  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: "DaemonSet",
    name: daemonSetName,
    namespace,
    apiVersion: "apps/v1",
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Restart"
        descriptor={{
          id: "daemonset.restart",
          title: "Restart DaemonSet",
          description: "Performs a rolling restart by patching the pod template annotation.",
          risk: "low",
          confirmSpec: { mode: "simple" },
          group: "apps",
          resource: "daemonsets",
        }}
        targetRef={targetRef}
        token={token}
        disabled={!canRestart}
        disabledReason={!canRestart && caps ? "Not permitted by RBAC" : ""}
        onSuccess={onRefresh}
      />

      <ActionButton
        label="Delete"
        color="error"
        descriptor={{
          id: "daemonset.delete",
          title: "Delete DaemonSet",
          description: "Permanently removes the daemonset and its pods.",
          risk: "high",
          confirmSpec: { mode: "typed", requiredValue: daemonSetName },
          group: "apps",
          resource: "daemonsets",
        }}
        targetRef={targetRef}
        token={token}
        disabled={!canDelete}
        disabledReason={!canDelete && caps ? "Not permitted by RBAC" : ""}
        onSuccess={onDeleted}
      />
    </Box>
  );
}
