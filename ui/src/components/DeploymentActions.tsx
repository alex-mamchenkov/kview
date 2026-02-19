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
  deploymentName: string;
  currentReplicas: number;
  onRefresh: () => void;
  onDeleted: () => void;
};

export default function DeploymentActions({
  token,
  namespace,
  deploymentName,
  currentReplicas,
  onRefresh,
  onDeleted,
}: Props) {
  const activeContext = useActiveContext();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  // Fetch RBAC capabilities for this deployment.
  useEffect(() => {
    if (!activeContext || !deploymentName) return;
    setCaps(null);
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group: "apps", resource: "deployments", namespace, name: deploymentName },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps({ delete: false, update: false, patch: false, create: false }));
  }, [activeContext, token, namespace, deploymentName]);

  const canScale = caps ? caps.patch || caps.update : false;
  const canRestart = caps ? caps.patch || caps.update : false;
  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: "Deployment",
    name: deploymentName,
    namespace,
    apiVersion: "apps/v1",
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Scale"
        descriptor={{
          id: "scale",
          title: "Scale Deployment",
          description: "Set the desired number of replicas.",
          risk: "low",
          confirmSpec: { mode: "simple" },
          group: "apps",
          resource: "deployments",
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
          id: "restart",
          title: "Restart Deployment",
          description: "Performs a rolling restart by patching the pod template annotation.",
          risk: "low",
          confirmSpec: { mode: "simple" },
          group: "apps",
          resource: "deployments",
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
          id: "delete",
          title: "Delete Deployment",
          description: "Permanently removes the deployment and its pods.",
          risk: "high",
          confirmSpec: { mode: "typed", requiredValue: deploymentName },
          group: "apps",
          resource: "deployments",
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
