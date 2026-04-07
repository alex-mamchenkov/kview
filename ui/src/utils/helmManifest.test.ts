import { describe, expect, it } from "vitest";
import { parseManifestResources } from "./helmManifest";

describe("parseManifestResources", () => {
  it("parses all resources from Helm multi-document manifests", () => {
    const manifest = `---
# Source: app/templates/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  annotations:
    werf.io/show-service-messages: "true"
  name: backend
  namespace: apps
---
# Source: app/templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: apps
spec:
  ports:
    - port: 80
---
# Source: app/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: apps
`;

    expect(parseManifestResources(manifest)).toEqual([
      { apiVersion: "v1", kind: "ServiceAccount", name: "backend", namespace: "apps" },
      { apiVersion: "v1", kind: "Service", name: "backend", namespace: "apps" },
      { apiVersion: "apps/v1", kind: "Deployment", name: "backend", namespace: "apps" },
    ]);
  });

  it("handles CRLF separators and quoted names", () => {
    const manifest =
      "---\r\napiVersion: v1\r\nkind: ConfigMap\r\nmetadata:\r\n  name: \"app-config\"\r\n---\r\napiVersion: v1\r\nkind: Secret\r\nmetadata:\r\n  name: 'app-secret'\r\n";

    expect(parseManifestResources(manifest)).toEqual([
      { apiVersion: "v1", kind: "ConfigMap", name: "app-config", namespace: undefined },
      { apiVersion: "v1", kind: "Secret", name: "app-secret", namespace: undefined },
    ]);
  });
});
