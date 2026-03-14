import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  clusterRoleName: string;
  onDeleted: () => void;
};

export default function ClusterRoleActions({ token, clusterRoleName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace=""
      name={clusterRoleName}
      onDeleted={onDeleted}
      config={{
        group: "rbac.authorization.k8s.io",
        resource: "clusterroles",
        kind: "ClusterRole",
        apiVersion: "rbac.authorization.k8s.io/v1",
        deleteId: "clusterrole.delete",
        deleteTitle: "Delete ClusterRole",
        deleteDescription:
          "Permanently removes the ClusterRole. ClusterRoleBindings referencing this role will become dangling.",
      }}
    />
  );
}
