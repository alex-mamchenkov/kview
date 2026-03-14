import React from "react";
import { DeleteOnlyActions } from "../../mutations/ResourceActions";

type Props = {
  token: string;
  namespace: string;
  jobName: string;
  onDeleted: () => void;
};

export default function JobActions({ token, namespace, jobName, onDeleted }: Props) {
  return (
    <DeleteOnlyActions
      token={token}
      namespace={namespace}
      name={jobName}
      onDeleted={onDeleted}
      config={{
        group: "batch",
        resource: "jobs",
        kind: "Job",
        apiVersion: "batch/v1",
        deleteId: "job.delete",
        deleteTitle: "Delete Job",
        deleteDescription: "Permanently removes the job and its pods.",
      }}
    />
  );
}
