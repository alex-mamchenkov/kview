import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  serviceName: string;
  onDeleted: () => void;
};

export default function ServiceActions({ token, namespace, serviceName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={serviceName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "services",
        kind: "Service",
        apiVersion: "v1",
        deleteId: "service.delete",
        deleteTitle: "Delete Service",
        deleteDescription:
          "Permanently removes the service. Workloads targeting this service will lose their endpoint.",
      }}
    />
  );
}
