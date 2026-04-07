import { apiPostWithContext, toApiError } from "../../api";
import { getConnectionState } from "../../connectionState";
import type { ExecuteActionRequest, ExecuteActionResult } from "./types";

/**
 * Calls the backend /api/actions endpoint with the X-Kview-Context header.
 *
 * Never throws — errors are encoded in the returned ExecuteActionResult.
 */
export async function executeAction(
  token: string,
  contextName: string,
  request: ExecuteActionRequest,
): Promise<ExecuteActionResult> {
  if (getConnectionState().health === "unhealthy") {
    return {
      success: false,
      message: "Cluster connection is unavailable. Actions are disabled until connectivity recovers.",
    };
  }

  try {
    const response = await apiPostWithContext<{
      result?: { status: string; message?: string; details?: unknown };
    }>(
      "/api/actions",
      token,
      contextName,
      {
        group: request.group ?? "",
        resource: request.resource ?? "",
        namespace: request.targetRef.namespace ?? "",
        name: request.targetRef.name,
        action: request.actionId,
        params: request.params,
      },
    );
    return {
      success: true,
      message: response?.result?.message,
      details: response?.result?.details,
    };
  } catch (e) {
    const apiErr = toApiError(e);
    return {
      success: false,
      message: apiErr.message,
      details: apiErr.details,
      status: apiErr.status,
    };
  }
}
