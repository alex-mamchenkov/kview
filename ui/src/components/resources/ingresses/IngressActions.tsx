import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  ingressName: string;
  onDeleted: () => void;
};

export default function IngressActions({ token, namespace, ingressName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={ingressName}
      onDeleted={onDeleted}
      config={{
        group: "networking.k8s.io",
        resource: "ingresses",
        kind: "Ingress",
        apiVersion: "networking.k8s.io/v1",
        deleteId: "ingress.delete",
        deleteTitle: "Delete Ingress",
        deleteDescription:
          "Permanently removes the ingress. Traffic routing rules for the associated hosts will be lost.",
      }}
    />
  );
}
