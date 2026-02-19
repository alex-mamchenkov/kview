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
  cronJobName: string;
  onDeleted: () => void;
};

export default function CronJobActions({ token, namespace, cronJobName, onDeleted }: Props) {
  const activeContext = useActiveContext();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    if (!activeContext || !cronJobName) return;
    setCaps(null);
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group: "batch", resource: "cronjobs", namespace, name: cronJobName },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps({ delete: false, update: false, patch: false, create: false }));
  }, [activeContext, token, namespace, cronJobName]);

  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: "CronJob",
    name: cronJobName,
    namespace,
    apiVersion: "batch/v1",
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Delete"
        color="error"
        descriptor={{
          id: "cronjob.delete",
          title: "Delete CronJob",
          description: "Permanently removes the cronjob and its active jobs.",
          risk: "high",
          confirmSpec: { mode: "typed", requiredValue: cronJobName },
          group: "batch",
          resource: "cronjobs",
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
