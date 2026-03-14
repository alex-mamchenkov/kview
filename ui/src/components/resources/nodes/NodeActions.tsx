import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  nodeName: string;
  onDeleted: () => void;
};

export default function NodeActions({ token, nodeName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace=""
      name={nodeName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "nodes",
        kind: "Node",
        apiVersion: "v1",
        deleteId: "nodes.delete",
        deleteTitle: "Delete Node",
        deleteDescription:
          "Permanently removes the Node from the cluster. Running pods will be rescheduled to other nodes.",
      }}
    />
  );
}
