/** Identifies the Kubernetes target of an action. */
export type TargetRef = {
  context: string;
  kind: string;
  name: string;
  namespace?: string;
  apiVersion?: string;
};

/** Risk level for a mutation action. */
export type ActionRisk = "low" | "medium" | "high";

/** Confirmation mode for a mutation. */
export type ConfirmMode = "none" | "simple" | "typed";

/**
 * Specification for how the user must confirm a mutation before execution.
 *
 * - none:   execute is available immediately (low-risk actions)
 * - simple: user must explicitly check a confirmation checkbox
 * - typed:  user must type the exact requiredValue (case-sensitive) to unlock execution
 */
export type ConfirmSpec =
  | { mode: "none" }
  | { mode: "simple" }
  | { mode: "typed"; requiredValue: string };

/**
 * Describes a mutation action that can be opened in the MutationDialog.
 *
 * `group` and `resource` are forwarded to the backend /api/actions endpoint.
 */
export type MutationActionDescriptor = {
  id: string;
  title: string;
  description?: string;
  risk?: ActionRisk;
  confirmSpec: ConfirmSpec;
  /** Kubernetes API group (e.g. "apps"). Forwarded to /api/actions. */
  group?: string;
  /** Kubernetes resource type (e.g. "deployments"). Forwarded to /api/actions. */
  resource?: string;
};

/** Request body forwarded to the backend /api/actions endpoint. */
export type ExecuteActionRequest = {
  actionId: string;
  targetRef: TargetRef;
  params?: Record<string, unknown>;
  /** Forwarded from MutationActionDescriptor. */
  group?: string;
  /** Forwarded from MutationActionDescriptor. */
  resource?: string;
};

/** Result returned by executeAction(). Never throws — errors are encoded here. */
export type ExecuteActionResult =
  | { success: true; message?: string; details?: unknown }
  | { success: false; message: string; details?: unknown; status?: number };
