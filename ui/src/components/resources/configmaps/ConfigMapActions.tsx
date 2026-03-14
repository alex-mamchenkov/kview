import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  configMapName: string;
  onDeleted: () => void;
};

export default function ConfigMapActions({ token, namespace, configMapName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={configMapName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "configmaps",
        kind: "ConfigMap",
        apiVersion: "v1",
        deleteId: "configmap.delete",
        deleteTitle: "Delete ConfigMap",
        deleteDescription:
          "Permanently removes the ConfigMap. Workloads mounting this ConfigMap will fail on next restart.",
      }}
    />
  );
}
