import { useState, useEffect } from "react";
import { apiPostWithContext } from "../../api";
import { useActiveContext } from "../../activeContext";
import { useConnectionState } from "../../connectionState";

export type Capabilities = {
  delete: boolean;
  update: boolean;
  patch: boolean;
  create: boolean;
};

export const RBAC_DISABLED_REASON = "Not permitted by RBAC";

export function canPatchOrUpdate(caps: Capabilities | null): boolean {
  return caps ? caps.patch || caps.update : false;
}

const CAPS_DENIED: Capabilities = { delete: false, update: false, patch: false, create: false };

/**
 * Fetches RBAC capabilities for a specific Kubernetes resource.
 *
 * Returns null while loading or when activeContext / name are not yet available.
 * Returns CAPS_DENIED on fetch failure (same as per-component fallback behavior).
 */
export function useResourceCapabilities({
  token,
  group,
  resource,
  namespace,
  name,
}: {
  token: string;
  group: string;
  resource: string;
  namespace: string;
  name: string;
}): Capabilities | null {
  const activeContext = useActiveContext();
  const { health } = useConnectionState();
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    if (!activeContext || !name) return;
    setCaps(null);
    if (health === "unhealthy") {
      setCaps(CAPS_DENIED);
      return;
    }
    apiPostWithContext<{ capabilities: Capabilities }>(
      "/api/capabilities",
      token,
      activeContext,
      { group, resource, namespace, name },
    )
      .then((res) => setCaps(res.capabilities))
      .catch(() => setCaps(CAPS_DENIED));
  }, [activeContext, token, namespace, name, group, resource, health]);

  return caps;
}
