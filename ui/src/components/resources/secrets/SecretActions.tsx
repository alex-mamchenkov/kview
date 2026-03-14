import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  secretName: string;
  onDeleted: () => void;
};

export default function SecretActions({ token, namespace, secretName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={secretName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "secrets",
        kind: "Secret",
        apiVersion: "v1",
        deleteId: "secret.delete",
        deleteTitle: "Delete Secret",
        deleteDescription:
          "Permanently removes the Secret. Workloads referencing this Secret will fail on next restart.",
      }}
    />
  );
}
