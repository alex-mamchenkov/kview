import React from "react";
import { Box } from "@mui/material";
import { useActiveContext } from "../../activeContext";
import ActionButton from "./ActionButton";
import {
  useResourceCapabilities,
  canPatchOrUpdate,
  RBAC_DISABLED_REASON,
} from "./useResourceCapabilities";
import {
  buildDeleteDescriptor,
  buildRestartDescriptor,
  buildScaleDescriptor,
} from "../../lib/actions/builders";

// ---------------------------------------------------------------------------
// Namespaced or cluster-scoped delete-only actions
// ---------------------------------------------------------------------------

export type DeleteOnlyActionsConfig = {
  group: string;
  resource: string;
  kind: string;
  apiVersion: string;
  deleteId: string;
  deleteTitle: string;
  deleteDescription: string;
};

export type DeleteOnlyActionsProps = {
  token: string;
  /** Empty string for cluster-scoped resources. */
  namespace: string;
  name: string;
  config: DeleteOnlyActionsConfig;
  onDeleted: () => void;
};

/**
 * Reusable delete-only action block for any namespaced or cluster-scoped resource.
 * Preserves RBAC checks, targetRef, and descriptor labels.
 */
export function DeleteOnlyActions({
  token,
  namespace,
  name,
  config,
  onDeleted,
}: DeleteOnlyActionsProps) {
  const activeContext = useActiveContext();
  const caps = useResourceCapabilities({
    token,
    group: config.group,
    resource: config.resource,
    namespace,
    name,
  });

  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: config.kind,
    name,
    namespace,
    apiVersion: config.apiVersion,
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Delete"
        color="error"
        descriptor={buildDeleteDescriptor({
          id: config.deleteId,
          title: config.deleteTitle,
          description: config.deleteDescription,
          group: config.group,
          resource: config.resource,
          requiredValue: name,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canDelete}
        disabledReason={!canDelete && caps ? RBAC_DISABLED_REASON : ""}
        onSuccess={onDeleted}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Workload: scale + restart + delete (Deployment, StatefulSet)
// ---------------------------------------------------------------------------

export type WorkloadScaleRestartDeleteConfig = {
  group: string;
  resource: string;
  kind: string;
  apiVersion: string;
  scaleId: string;
  scaleTitle: string;
  scaleDescription: string;
  restartId: string;
  restartTitle: string;
  restartDescription: string;
  deleteId: string;
  deleteTitle: string;
  deleteDescription: string;
};

export type WorkloadScaleRestartDeleteProps = {
  token: string;
  namespace: string;
  name: string;
  currentReplicas: number;
  onRefresh: () => void;
  onDeleted: () => void;
  config: WorkloadScaleRestartDeleteConfig;
};

export function WorkloadScaleRestartDeleteActions({
  token,
  namespace,
  name,
  currentReplicas,
  onRefresh,
  onDeleted,
  config,
}: WorkloadScaleRestartDeleteProps) {
  const activeContext = useActiveContext();
  const caps = useResourceCapabilities({
    token,
    group: config.group,
    resource: config.resource,
    namespace,
    name,
  });

  const canScale = canPatchOrUpdate(caps);
  const canRestart = canPatchOrUpdate(caps);
  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: config.kind,
    name,
    namespace,
    apiVersion: config.apiVersion,
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Scale"
        descriptor={buildScaleDescriptor({
          id: config.scaleId,
          title: config.scaleTitle,
          description: config.scaleDescription,
          group: config.group,
          resource: config.resource,
          defaultReplicas: currentReplicas,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canScale}
        disabledReason={!canScale && caps ? RBAC_DISABLED_REASON : ""}
        initialParams={{ replicas: String(currentReplicas) }}
        onSuccess={onRefresh}
      />

      <ActionButton
        label="Restart"
        descriptor={buildRestartDescriptor({
          id: config.restartId,
          title: config.restartTitle,
          description: config.restartDescription,
          group: config.group,
          resource: config.resource,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canRestart}
        disabledReason={!canRestart && caps ? RBAC_DISABLED_REASON : ""}
        onSuccess={onRefresh}
      />

      <ActionButton
        label="Delete"
        color="error"
        descriptor={buildDeleteDescriptor({
          id: config.deleteId,
          title: config.deleteTitle,
          description: config.deleteDescription,
          group: config.group,
          resource: config.resource,
          requiredValue: name,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canDelete}
        disabledReason={!canDelete && caps ? RBAC_DISABLED_REASON : ""}
        onSuccess={onDeleted}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Workload: restart + delete (DaemonSet)
// ---------------------------------------------------------------------------

export type WorkloadRestartDeleteConfig = {
  group: string;
  resource: string;
  kind: string;
  apiVersion: string;
  restartId: string;
  restartTitle: string;
  restartDescription: string;
  deleteId: string;
  deleteTitle: string;
  deleteDescription: string;
};

export type WorkloadRestartDeleteProps = {
  token: string;
  namespace: string;
  name: string;
  onRefresh: () => void;
  onDeleted: () => void;
  config: WorkloadRestartDeleteConfig;
};

export function WorkloadRestartDeleteActions({
  token,
  namespace,
  name,
  onRefresh,
  onDeleted,
  config,
}: WorkloadRestartDeleteProps) {
  const activeContext = useActiveContext();
  const caps = useResourceCapabilities({
    token,
    group: config.group,
    resource: config.resource,
    namespace,
    name,
  });

  const canRestart = canPatchOrUpdate(caps);
  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: config.kind,
    name,
    namespace,
    apiVersion: config.apiVersion,
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Restart"
        descriptor={buildRestartDescriptor({
          id: config.restartId,
          title: config.restartTitle,
          description: config.restartDescription,
          group: config.group,
          resource: config.resource,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canRestart}
        disabledReason={!canRestart && caps ? RBAC_DISABLED_REASON : ""}
        onSuccess={onRefresh}
      />

      <ActionButton
        label="Delete"
        color="error"
        descriptor={buildDeleteDescriptor({
          id: config.deleteId,
          title: config.deleteTitle,
          description: config.deleteDescription,
          group: config.group,
          resource: config.resource,
          requiredValue: name,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canDelete}
        disabledReason={!canDelete && caps ? RBAC_DISABLED_REASON : ""}
        onSuccess={onDeleted}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Workload: scale + delete (ReplicaSet)
// ---------------------------------------------------------------------------

export type WorkloadScaleDeleteConfig = {
  group: string;
  resource: string;
  kind: string;
  apiVersion: string;
  scaleId: string;
  scaleTitle: string;
  scaleDescription: string;
  deleteId: string;
  deleteTitle: string;
  deleteDescription: string;
};

export type WorkloadScaleDeleteProps = {
  token: string;
  namespace: string;
  name: string;
  currentReplicas: number;
  onRefresh: () => void;
  onDeleted: () => void;
  config: WorkloadScaleDeleteConfig;
};

export function WorkloadScaleDeleteActions({
  token,
  namespace,
  name,
  currentReplicas,
  onRefresh,
  onDeleted,
  config,
}: WorkloadScaleDeleteProps) {
  const activeContext = useActiveContext();
  const caps = useResourceCapabilities({
    token,
    group: config.group,
    resource: config.resource,
    namespace,
    name,
  });

  const canScale = canPatchOrUpdate(caps);
  const canDelete = caps ? caps.delete : false;

  const targetRef = {
    context: activeContext,
    kind: config.kind,
    name,
    namespace,
    apiVersion: config.apiVersion,
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <ActionButton
        label="Scale"
        descriptor={buildScaleDescriptor({
          id: config.scaleId,
          title: config.scaleTitle,
          description: config.scaleDescription,
          group: config.group,
          resource: config.resource,
          defaultReplicas: currentReplicas,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canScale}
        disabledReason={!canScale && caps ? RBAC_DISABLED_REASON : ""}
        initialParams={{ replicas: String(currentReplicas) }}
        onSuccess={onRefresh}
      />

      <ActionButton
        label="Delete"
        color="error"
        descriptor={buildDeleteDescriptor({
          id: config.deleteId,
          title: config.deleteTitle,
          description: config.deleteDescription,
          group: config.group,
          resource: config.resource,
          requiredValue: name,
        })}
        targetRef={targetRef}
        token={token}
        disabled={!canDelete}
        disabledReason={!canDelete && caps ? RBAC_DISABLED_REASON : ""}
        onSuccess={onDeleted}
      />
    </Box>
  );
}
