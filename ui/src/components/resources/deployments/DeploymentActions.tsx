import React from "react";
import { WorkloadScaleRestartDeleteActions } from "../../mutations/ResourceActions";

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
  return (
    <WorkloadScaleRestartDeleteActions
      token={token}
      namespace={namespace}
      name={deploymentName}
      currentReplicas={currentReplicas}
      onRefresh={onRefresh}
      onDeleted={onDeleted}
      config={{
        group: "apps",
        resource: "deployments",
        kind: "Deployment",
        apiVersion: "apps/v1",
        scaleId: "scale",
        scaleTitle: "Scale Deployment",
        scaleDescription: "Set the desired number of replicas.",
        restartId: "restart",
        restartTitle: "Restart Deployment",
        restartDescription:
          "Performs a rolling restart by patching the pod template annotation.",
        deleteId: "delete",
        deleteTitle: "Delete Deployment",
        deleteDescription: "Permanently removes the deployment and its pods.",
      }}
    />
  );
}
