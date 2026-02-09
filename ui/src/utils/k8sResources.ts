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
  | "nodes"
  | "namespaces";

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
  nodes: { group: "", resource: "nodes" },
  namespaces: { group: "", resource: "namespaces" },
};
