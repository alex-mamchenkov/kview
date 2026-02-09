export type AccessReviewResource = {
  group: string;
  resource: string;
};

export type ListResourceKey =
  | "pods"
  | "deployments"
  | "replicasets"
  | "services"
  | "ingresses"
  | "jobs"
  | "cronjobs"
  | "configmaps"
  | "secrets"
  | "nodes"
  | "namespaces";

export const listResourceAccess: Record<ListResourceKey, AccessReviewResource> = {
  pods: { group: "", resource: "pods" },
  deployments: { group: "apps", resource: "deployments" },
  replicasets: { group: "apps", resource: "replicasets" },
  services: { group: "", resource: "services" },
  ingresses: { group: "networking.k8s.io", resource: "ingresses" },
  jobs: { group: "batch", resource: "jobs" },
  cronjobs: { group: "batch", resource: "cronjobs" },
  configmaps: { group: "", resource: "configmaps" },
  secrets: { group: "", resource: "secrets" },
  nodes: { group: "", resource: "nodes" },
  namespaces: { group: "", resource: "namespaces" },
};
