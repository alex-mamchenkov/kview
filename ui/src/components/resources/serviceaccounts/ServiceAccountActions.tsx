import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  serviceAccountName: string;
  onDeleted: () => void;
};

export default function ServiceAccountActions({
  token,
  namespace,
  serviceAccountName,
  onDeleted,
}: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={serviceAccountName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "serviceaccounts",
        kind: "ServiceAccount",
        apiVersion: "v1",
        deleteId: "serviceaccount.delete",
        deleteTitle: "Delete ServiceAccount",
        deleteDescription:
          "Permanently removes the ServiceAccount. Workloads using this ServiceAccount may lose access.",
      }}
    />
  );
}
