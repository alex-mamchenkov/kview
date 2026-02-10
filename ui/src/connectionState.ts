import { useSyncExternalStore } from "react";

export type ConnectionHealth = "healthy" | "unhealthy";
export type ConnectionIssueKind = "backend" | "request";

export type ConnectionIssue = {
  kind: ConnectionIssueKind;
  message: string;
  id: string;
  at: number;
};

export type ConnectionState = {
  health: ConnectionHealth;
  activeIssue?: ConnectionIssue;
  lastTransitionAt: number;
  retryNonce: number;
  lastRecoveryShownAt?: number;
};

const state: ConnectionState = {
  health: "healthy",
  lastTransitionAt: Date.now(),
  retryNonce: 0,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function getConnectionState(): ConnectionState {
  return state;
}

export function subscribeConnectionState(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConnectionState(): ConnectionState {
  return useSyncExternalStore(subscribeConnectionState, getConnectionState, getConnectionState);
}

export function notifyApiSuccess() {
  if (state.health === "healthy") return;
  const now = Date.now();
  state.health = "healthy";
  state.activeIssue = undefined;
  state.lastTransitionAt = now;
  state.lastRecoveryShownAt = now;
  emitChange();
}

export function notifyApiFailure(kind: ConnectionIssueKind, message: string) {
  if (state.health === "unhealthy") return;
  const now = Date.now();
  state.health = "unhealthy";
  state.activeIssue = {
    kind,
    message,
    id: `issue-${now}`,
    at: now,
  };
  state.lastTransitionAt = now;
  emitChange();
}

export function requestConnectionRetry() {
  state.retryNonce += 1;
  emitChange();
}
