import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  pvName: string;
  onDeleted: () => void;
};

export default function PVActions({ token, pvName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace=""
      name={pvName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "persistentvolumes",
        kind: "PersistentVolume",
        apiVersion: "v1",
        deleteId: "persistentvolumes.delete",
        deleteTitle: "Delete PersistentVolume",
        deleteDescription:
          "Permanently removes the PersistentVolume. Bound PVCs will lose their backing storage.",
      }}
    />
  );
}
