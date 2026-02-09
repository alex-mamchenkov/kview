import type { Section } from "../state";

export type AccessReviewResource = {
  group: string;
  resource: string;
};

export type ListResourceKey =
  | "pods"
  | "deployments"
  | "daemonsets"
  | "statefulsets"
  | "replicasets"
  | "services"
  | "ingresses"
  | "jobs"
  | "cronjobs"
  | "configmaps"
  | "secrets"
  | "persistentvolumeclaims"
  | "persistentvolumes"
  | "nodes"
  | "namespaces";

export type ResourceMeta = {
  label: string;
  clusterScoped: boolean;
};

export type SidebarGroup = {
  id: string;
  label: string;
  items: ListResourceKey[];
};

export const resourceMeta: Record<ListResourceKey, ResourceMeta> = {
  pods: { label: "Pods", clusterScoped: false },
  deployments: { label: "Deployments", clusterScoped: false },
  daemonsets: { label: "Daemon Sets", clusterScoped: false },
  statefulsets: { label: "Stateful Sets", clusterScoped: false },
  replicasets: { label: "Replica Sets", clusterScoped: false },
  services: { label: "Services", clusterScoped: false },
  ingresses: { label: "Ingresses", clusterScoped: false },
  jobs: { label: "Jobs", clusterScoped: false },
  cronjobs: { label: "Cron Jobs", clusterScoped: false },
  configmaps: { label: "Config Maps", clusterScoped: false },
  secrets: { label: "Secrets", clusterScoped: false },
  persistentvolumeclaims: { label: "Persistent Volume Claims", clusterScoped: false },
  persistentvolumes: { label: "Persistent Volumes", clusterScoped: true },
  nodes: { label: "Nodes", clusterScoped: true },
  namespaces: { label: "Namespaces", clusterScoped: true },
};

export const sidebarGroups: SidebarGroup[] = [
  {
    id: "workloads",
    label: "Workloads",
    items: ["pods", "deployments", "statefulsets", "daemonsets", "jobs", "cronjobs"],
  },
  {
    id: "networking",
    label: "Networking",
    items: ["services", "ingresses"],
  },
  {
    id: "configuration",
    label: "Configuration",
    items: ["configmaps", "secrets"],
  },
  {
    id: "storage",
    label: "Storage",
    items: ["persistentvolumeclaims", "persistentvolumes"],
  },
  {
    id: "cluster",
    label: "Cluster",
    items: ["nodes", "namespaces"],
  },
];

export function getResourceLabel(key: ListResourceKey): string {
  return resourceMeta[key]?.label ?? key;
}

export function isClusterScopedResource(key: ListResourceKey): boolean {
  return resourceMeta[key]?.clusterScoped ?? false;
}

export function isClusterScopedSection(section: Section): boolean {
  if (Object.prototype.hasOwnProperty.call(resourceMeta, section)) {
    return resourceMeta[section as ListResourceKey].clusterScoped ?? false;
  }
  return false;
}

export const listResourceAccess: Record<ListResourceKey, AccessReviewResource> = {
  pods: { group: "", resource: "pods" },
  deployments: { group: "apps", resource: "deployments" },
  daemonsets: { group: "apps", resource: "daemonsets" },
  statefulsets: { group: "apps", resource: "statefulsets" },
  replicasets: { group: "apps", resource: "replicasets" },
  services: { group: "", resource: "services" },
  ingresses: { group: "networking.k8s.io", resource: "ingresses" },
  jobs: { group: "batch", resource: "jobs" },
  cronjobs: { group: "batch", resource: "cronjobs" },
  configmaps: { group: "", resource: "configmaps" },
  secrets: { group: "", resource: "secrets" },
  persistentvolumeclaims: { group: "", resource: "persistentvolumeclaims" },
  persistentvolumes: { group: "", resource: "persistentvolumes" },
  nodes: { group: "", resource: "nodes" },
  namespaces: { group: "", resource: "namespaces" },
};
