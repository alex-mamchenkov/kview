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
  replicaSetName: string;
  currentReplicas: number;
  onRefresh: () => void;
  onDeleted: () => void;
};

export default function ReplicaSetActions({
  token,
  namespace,
  replicaSetName,
  currentReplicas,
  onRefresh,
  onDeleted,
}: Props) {
  const activeContext = useActiveContext();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    if (!activeContext || !replicaSetName) return;
    setCaps(null);
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group: "apps", resource: "replicasets", namespace, name: replicaSetName },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps({ delete: false, update: false, patch: false, create: false }));
  }, [activeContext, token, namespace, replicaSetName]);

  const canScale = caps ? caps.patch || caps.update : false;
  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: "ReplicaSet",
    name: replicaSetName,
    namespace,
    apiVersion: "apps/v1",
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Scale"
        descriptor={{
          id: "replicaset.scale",
          title: "Scale ReplicaSet",
          description: "Set the desired number of replicas.",
          risk: "low",
          confirmSpec: { mode: "simple" },
          group: "apps",
          resource: "replicasets",
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
        label="Delete"
        color="error"
        descriptor={{
          id: "replicaset.delete",
          title: "Delete ReplicaSet",
          description: "Permanently removes the replicaset and its pods.",
          risk: "high",
          confirmSpec: { mode: "typed", requiredValue: replicaSetName },
          group: "apps",
          resource: "replicasets",
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
