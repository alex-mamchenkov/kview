import React from "react";
import { WorkloadScaleDeleteActions } from "../../mutations/ResourceActions";

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
  return (
    <WorkloadScaleDeleteActions
      token={token}
      namespace={namespace}
      name={replicaSetName}
      currentReplicas={currentReplicas}
      onRefresh={onRefresh}
      onDeleted={onDeleted}
      config={{
        group: "apps",
        resource: "replicasets",
        kind: "ReplicaSet",
        apiVersion: "apps/v1",
        scaleId: "replicaset.scale",
        scaleTitle: "Scale ReplicaSet",
        scaleDescription: "Set the desired number of replicas.",
        deleteId: "replicaset.delete",
        deleteTitle: "Delete ReplicaSet",
        deleteDescription: "Permanently removes the replicaset and its pods.",
      }}
    />
  );
}
