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
  statefulSetName: string;
  currentReplicas: number;
  onRefresh: () => void;
  onDeleted: () => void;
};

export default function StatefulSetActions({
  token,
  namespace,
  statefulSetName,
  currentReplicas,
  onRefresh,
  onDeleted,
}: Props) {
  const activeContext = useActiveContext();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    if (!activeContext || !statefulSetName) return;
    setCaps(null);
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group: "apps", resource: "statefulsets", namespace, name: statefulSetName },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps({ delete: false, update: false, patch: false, create: false }));
  }, [activeContext, token, namespace, statefulSetName]);

  const canScale = caps ? caps.patch || caps.update : false;
  const canRestart = caps ? caps.patch || caps.update : false;
  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: "StatefulSet",
    name: statefulSetName,
    namespace,
    apiVersion: "apps/v1",
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Scale"
        descriptor={{
          id: "statefulset.scale",
          title: "Scale StatefulSet",
          description: "Set the desired number of replicas.",
          risk: "low",
          confirmSpec: { mode: "simple" },
          group: "apps",
          resource: "statefulsets",
          paramSpecs: [
            {
              kind: "numeric",
              key: "replicas",
              label: "Replicas",
              min: 0,
              defaultValue: currentReplicas,
              required: true,
            },
          ],
        }}
        targetRef={targetRef}
        token={token}
        disabled={!canScale}
        disabledReason={!canScale && caps ? "Not permitted by RBAC" : ""}
        initialParams={{ replicas: String(currentReplicas) }}
        onSuccess={onRefresh}
      />

      <ActionButton
        label="Restart"
        descriptor={{
          id: "statefulset.restart",
          title: "Restart StatefulSet",
          description: "Performs a rolling restart by patching the pod template annotation.",
          risk: "low",
          confirmSpec: { mode: "simple" },
          group: "apps",
          resource: "statefulsets",
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
          id: "statefulset.delete",
          title: "Delete StatefulSet",
          description: "Permanently removes the statefulset and its pods.",
          risk: "high",
          confirmSpec: { mode: "typed", requiredValue: statefulSetName },
          group: "apps",
          resource: "statefulsets",
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
