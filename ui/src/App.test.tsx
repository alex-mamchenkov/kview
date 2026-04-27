// @vitest-environment node

import { describe, expect, it } from "vitest";
import { buildDataplaneBundleForSync } from "./dataplaneSync";
import { defaultUserSettings } from "./settings";

describe("buildDataplaneBundleForSync", () => {
  it("builds a full v2 bundle payload with context overrides", () => {
    const settings = defaultUserSettings();
    settings.appearance.dashboardRefreshSec = 30;
    settings.dataplane.contextOverrides["ctx-a"] = {
      metrics: { enabled: false },
      signals: {
        overrides: {
          pod_restarts: { severity: "high" },
        },
      },
    };
    const payload = buildDataplaneBundleForSync(settings.dataplane, settings.appearance.dashboardRefreshSec);
    expect(payload).toMatchObject({
      global: {
        profile: settings.dataplane.global.profile,
        dashboard: {
          refreshSec: 30,
        },
      },
      contextOverrides: settings.dataplane.contextOverrides,
    });
    expect(payload.global.metrics.enabled).toBe(settings.dataplane.global.metrics.enabled);
    expect("profile" in payload).toBe(false);
  });
});
