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
  podName: string;
  onDeleted: () => void;
};

export default function PodActions({ token, namespace, podName, onDeleted }: Props) {
  const activeContext = useActiveContext();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    if (!activeContext || !podName) return;
    setCaps(null);
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group: "", resource: "pods", namespace, name: podName },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps({ delete: false, update: false, patch: false, create: false }));
  }, [activeContext, token, namespace, podName]);

  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: "Pod",
    name: podName,
    namespace,
    apiVersion: "v1",
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Delete"
        color="error"
        descriptor={{
          id: "pod.delete",
          title: "Delete Pod",
          description: "Permanently removes the pod. A new pod may be created by the owner controller.",
          risk: "high",
          confirmSpec: { mode: "typed", requiredValue: podName },
          group: "",
          resource: "pods",
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
