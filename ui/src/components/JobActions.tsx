import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { apiPostWithContext } from "../api";
import { useActiveContext } from "../activeContext";
import ActionButton from "./mutations/ActionButton";

type Capabilities = {
  delete: boolean;
  update: boolean;
  patch: boolean;
  create: boolean;
};

type Props = {
  token: string;
  namespace: string;
  jobName: string;
  onDeleted: () => void;
};

export default function JobActions({ token, namespace, jobName, onDeleted }: Props) {
  const activeContext = useActiveContext();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    if (!activeContext || !jobName) return;
    setCaps(null);
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group: "batch", resource: "jobs", namespace, name: jobName },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps({ delete: false, update: false, patch: false, create: false }));
  }, [activeContext, token, namespace, jobName]);

  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: "Job",
    name: jobName,
    namespace,
    apiVersion: "batch/v1",
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Delete"
        color="error"
        descriptor={{
          id: "job.delete",
          title: "Delete Job",
          description: "Permanently removes the job and its pods.",
          risk: "high",
          confirmSpec: { mode: "typed", requiredValue: jobName },
          group: "batch",
          resource: "jobs",
        }}
        targetRef={targetRef}
        token={token}
        disabled={!canDelete}
        disabledReason={!canDelete && caps ? "Not permitted by RBAC" : ""}
        onSuccess={onDeleted}
      />
    </Box>
  );
}
