import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  roleBindingName: string;
  onDeleted: () => void;
};

export default function RoleBindingActions({
  token,
  namespace,
  roleBindingName,
  onDeleted,
}: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={roleBindingName}
      onDeleted={onDeleted}
      config={{
        group: "rbac.authorization.k8s.io",
        resource: "rolebindings",
        kind: "RoleBinding",
        apiVersion: "rbac.authorization.k8s.io/v1",
        deleteId: "rolebinding.delete",
        deleteTitle: "Delete RoleBinding",
        deleteDescription:
          "Permanently removes the RoleBinding. Subjects will lose the permissions granted by this binding.",
      }}
    />
  );
}
