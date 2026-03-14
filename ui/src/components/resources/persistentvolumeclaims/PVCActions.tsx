import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  pvcName: string;
  onDeleted: () => void;
};

export default function PVCActions({ token, namespace, pvcName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={pvcName}
      onDeleted={onDeleted}
      config={{
        group: "",
        resource: "persistentvolumeclaims",
        kind: "PersistentVolumeClaim",
        apiVersion: "v1",
        deleteId: "persistentvolumeclaims.delete",
        deleteTitle: "Delete PersistentVolumeClaim",
        deleteDescription:
          "Permanently removes the PersistentVolumeClaim. Pods using this PVC will lose access to the volume.",
      }}
    />
  );
}
