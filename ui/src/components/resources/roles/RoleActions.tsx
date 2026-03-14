import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  roleName: string;
  onDeleted: () => void;
};

export default function RoleActions({ token, namespace, roleName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={roleName}
      onDeleted={onDeleted}
      config={{
        group: "rbac.authorization.k8s.io",
        resource: "roles",
        kind: "Role",
        apiVersion: "rbac.authorization.k8s.io/v1",
        deleteId: "role.delete",
        deleteTitle: "Delete Role",
        deleteDescription:
          "Permanently removes the Role. RoleBindings referencing this Role will become dangling.",
      }}
    />
  );
}
