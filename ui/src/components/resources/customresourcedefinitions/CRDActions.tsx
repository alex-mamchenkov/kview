import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  crdName: string;
  onDeleted: () => void;
};

export default function CRDActions({ token, crdName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace=""
      name={crdName}
      onDeleted={onDeleted}
      config={{
        group: "apiextensions.k8s.io",
        resource: "customresourcedefinitions",
        kind: "CustomResourceDefinition",
        apiVersion: "apiextensions.k8s.io/v1",
        deleteId: "customresourcedefinitions.delete",
        deleteTitle: "Delete CustomResourceDefinition",
        deleteDescription:
          "Permanently removes the CRD and all associated custom resources. This is irreversible.",
      }}
    />
  );
}
