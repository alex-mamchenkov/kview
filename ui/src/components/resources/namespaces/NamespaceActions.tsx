import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespaceName: string;
  onDeleted: () => void;
};

export default function NamespaceActions({ token, namespaceName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace=""
      name={namespaceName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "namespaces",
        kind: "Namespace",
        apiVersion: "v1",
        deleteId: "namespaces.delete",
        deleteTitle: "Delete Namespace",
        deleteDescription:
          "Permanently removes the Namespace and all resources within it. This is irreversible.",
      }}
    />
  );
}
