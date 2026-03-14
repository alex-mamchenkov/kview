import React from "react";
import { WorkloadRestartDeleteActions } from "../../mutations/ResourceActions";

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
  return (
    <WorkloadRestartDeleteActions
      token={token}
      namespace={namespace}
      name={daemonSetName}
      onRefresh={onRefresh}
      onDeleted={onDeleted}
      config={{
        group: "apps",
        resource: "daemonsets",
        kind: "DaemonSet",
        apiVersion: "apps/v1",
        restartId: "daemonset.restart",
        restartTitle: "Restart DaemonSet",
        restartDescription:
          "Performs a rolling restart by patching the pod template annotation.",
        deleteId: "daemonset.delete",
        deleteTitle: "Delete DaemonSet",
        deleteDescription: "Permanently removes the daemonset and its pods.",
      }}
    />
  );
}
