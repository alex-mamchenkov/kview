import React from "react";
import { WorkloadScaleRestartDeleteActions } from "../../mutations/ResourceActions";

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
  return (
    <WorkloadScaleRestartDeleteActions
      token={token}
      namespace={namespace}
      name={statefulSetName}
      currentReplicas={currentReplicas}
      onRefresh={onRefresh}
      onDeleted={onDeleted}
      config={{
        group: "apps",
        resource: "statefulsets",
        kind: "StatefulSet",
        apiVersion: "apps/v1",
        scaleId: "statefulset.scale",
        scaleTitle: "Scale StatefulSet",
        scaleDescription: "Set the desired number of replicas.",
        restartId: "statefulset.restart",
        restartTitle: "Restart StatefulSet",
        restartDescription:
          "Performs a rolling restart by patching the pod template annotation.",
        deleteId: "statefulset.delete",
        deleteTitle: "Delete StatefulSet",
        deleteDescription: "Permanently removes the statefulset and its pods.",
      }}
    />
  );
}
