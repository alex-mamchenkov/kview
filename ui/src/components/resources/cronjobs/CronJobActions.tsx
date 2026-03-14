import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  cronJobName: string;
  onDeleted: () => void;
};

export default function CronJobActions({ token, namespace, cronJobName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={cronJobName}
      onDeleted={onDeleted}
      config={{
        group: "batch",
        resource: "cronjobs",
        kind: "CronJob",
        apiVersion: "batch/v1",
        deleteId: "cronjob.delete",
        deleteTitle: "Delete CronJob",
        deleteDescription: "Permanently removes the cronjob and its active jobs.",
      }}
    />
  );
}
