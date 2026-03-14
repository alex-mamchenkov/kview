import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  clusterRoleBindingName: string;
  onDeleted: () => void;
};

export default function ClusterRoleBindingActions({
  token,
  clusterRoleBindingName,
  onDeleted,
}: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace=""
      name={clusterRoleBindingName}
      onDeleted={onDeleted}
      config={{
        group: "rbac.authorization.k8s.io",
        resource: "clusterrolebindings",
        kind: "ClusterRoleBinding",
        apiVersion: "rbac.authorization.k8s.io/v1",
        deleteId: "clusterrolebinding.delete",
        deleteTitle: "Delete ClusterRoleBinding",
        deleteDescription:
          "Permanently removes the ClusterRoleBinding. Subjects will lose all cluster-wide permissions granted by this binding.",
      }}
    />
  );
}
