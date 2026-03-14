import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  podName: string;
  onDeleted: () => void;
};

export default function PodActions({ token, namespace, podName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={podName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "pods",
        kind: "Pod",
        apiVersion: "v1",
        deleteId: "pod.delete",
        deleteTitle: "Delete Pod",
        deleteDescription:
          "Permanently removes the pod. A new pod may be created by the owner controller.",
      }}
    />
  );
}
