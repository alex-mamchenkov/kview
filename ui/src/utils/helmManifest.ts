/**
 * Parsed resource reference from a Helm release manifest.
 */
export type ManifestResource = {
  kind: string;
  name: string;
  namespace?: string;
  apiVersion?: string;
};

/**
 * Parse a Helm manifest (multi-document YAML string) into resource references.
 * Uses regex-based extraction — does not require a full YAML parser.
 * Relies on the predictable structure of Helm-rendered Kubernetes manifests.
 */
export function parseManifestResources(manifest: string): ManifestResource[] {
  if (!manifest || !manifest.trim()) return [];

  const docs = manifest.split(/\n---(?:\s*)(?:\n|$)/);
  const resources: ManifestResource[] = [];

  for (const doc of docs) {
    const trimmed = doc.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const kind = trimmed.match(/^kind:\s*(.+)$/m)?.[1]?.trim();
    if (!kind) continue;

    const apiVersion = trimmed.match(/^apiVersion:\s*(.+)$/m)?.[1]?.trim();

    // Extract metadata block fields.
    // metadata: is at indent level 0, name/namespace are at indent level 1 (2 spaces).
    const metadataMatch = trimmed.match(/^metadata:\s*\n((?:[ \t]+.+\n?)*)/m);
    let name: string | undefined;
    let namespace: string | undefined;

    if (metadataMatch) {
      const metaBlock = metadataMatch[1];
      name = metaBlock.match(/^\s+name:\s*(.+)$/m)?.[1]?.trim();
      namespace = metaBlock.match(/^\s+namespace:\s*(.+)$/m)?.[1]?.trim();
    }

    if (!name) continue;

    // Strip surrounding quotes if present
    if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
    if (namespace?.startsWith('"') && namespace?.endsWith('"')) namespace = namespace.slice(1, -1);

    resources.push({ kind, name, namespace, apiVersion });
  }

  return resources;
}

/**
 * Map of Kubernetes kind to the resource key used in kview navigation.
 * Only includes kinds that have drawers in the UI.
 */
const kindToNavKey: Record<string, string> = {
  Deployment: "deployments",
  StatefulSet: "statefulsets",
  DaemonSet: "daemonsets",
  Service: "services",
  Ingress: "ingresses",
  ConfigMap: "configmaps",
  Secret: "secrets",
  Job: "jobs",
  CronJob: "cronjobs",
  PersistentVolumeClaim: "persistentvolumeclaims",
  PersistentVolume: "persistentvolumes",
  ServiceAccount: "serviceaccounts",
  Role: "roles",
  RoleBinding: "rolebindings",
  ClusterRole: "clusterroles",
  ClusterRoleBinding: "clusterrolebindings",
  CustomResourceDefinition: "customresourcedefinitions",
  Namespace: "namespaces",
  Node: "nodes",
  Pod: "pods",
  ReplicaSet: "replicasets",
};

/**
 * Check if a manifest resource kind can be navigated to in the UI.
 */
export function canNavigateToKind(kind: string): boolean {
  return kind in kindToNavKey;
}

/**
 * Group manifest resources by kind for display.
 */
export function groupResourcesByKind(
  resources: ManifestResource[],
): { kind: string; items: ManifestResource[] }[] {
  const map = new Map<string, ManifestResource[]>();
  for (const r of resources) {
    const list = map.get(r.kind) || [];
    list.push(r);
    map.set(r.kind, list);
  }
  // Sort groups: navigable kinds first, then alphabetically
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const aNav = canNavigateToKind(a);
      const bNav = canNavigateToKind(b);
      if (aNav !== bNav) return aNav ? -1 : 1;
      return a.localeCompare(b);
    })
    .map(([kind, items]) => ({ kind, items }));
}
