import type { KviewUserSettingsV2 } from "./settings";

export function buildDataplaneBundleForSync(
  dataplaneSettings: KviewUserSettingsV2["dataplane"],
  dashboardRefreshSec: number,
) {
  return {
    global: {
      ...dataplaneSettings.global,
      dashboard: {
        ...dataplaneSettings.global.dashboard,
        refreshSec: dashboardRefreshSec,
      },
    },
    contextOverrides: dataplaneSettings.contextOverrides,
  };
}
