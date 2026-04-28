import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getConnectionState,
  notifyApiFailure,
  notifyApiSuccess,
  notifyStatus,
  requestConnectionRetry,
  subscribeConnectionState,
} from "./connectionState";

function resetHealthy() {
  notifyStatus({
    ok: true,
    activeContext: "ctx",
    backend: { ok: true, version: "test" },
    cluster: { ok: true, context: "ctx" },
    checkedAt: new Date(0).toISOString(),
  });
}

describe("connectionState", () => {
  afterEach(() => {
    resetHealthy();
  });

  it("tracks backend failures and recovery", () => {
    notifyApiFailure("backend", "backend down");
    expect(getConnectionState()).toMatchObject({
      health: "unhealthy",
      backendHealth: "unhealthy",
      activeIssue: { kind: "backend", message: "backend down" },
    });

    const beforeRecovery = Date.now();
    notifyApiSuccess();
    expect(getConnectionState()).toMatchObject({
      health: "healthy",
      backendHealth: "healthy",
      activeIssue: undefined,
    });
    expect(getConnectionState().lastRecoveryShownAt).toBeGreaterThanOrEqual(beforeRecovery);
  });

  it("tracks cluster health from status responses", () => {
    notifyStatus({
      ok: false,
      activeContext: "kind-dev",
      backend: { ok: true, version: "v1" },
      cluster: { ok: false, context: "kind-dev", message: "forbidden" },
      checkedAt: new Date(0).toISOString(),
    });

    expect(getConnectionState()).toMatchObject({
      health: "unhealthy",
      backendHealth: "healthy",
      clusterHealth: "unhealthy",
      backendVersion: "v1",
      activeIssue: { kind: "cluster", message: "forbidden" },
    });
  });

  it("request failures are surfaced without changing global health", () => {
    resetHealthy();
    notifyApiFailure("request", "bad input");

    expect(getConnectionState()).toMatchObject({
      health: "healthy",
      activeIssue: { kind: "request", message: "bad input" },
    });
  });

  it("notifies subscribers when retry nonce changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeConnectionState(listener);

    const before = getConnectionState().retryNonce;
    requestConnectionRetry();

    expect(getConnectionState().retryNonce).toBe(before + 1);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});
