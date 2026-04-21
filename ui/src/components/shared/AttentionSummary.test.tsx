// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AttentionSummary from "./AttentionSummary";
import type { DashboardSignalItem } from "../../types/api";

function signal(overrides: Partial<DashboardSignalItem> = {}): DashboardSignalItem {
  return {
    kind: "Pod",
    severity: "medium",
    score: 1,
    reason: "CrashLoopBackOff",
    ...overrides,
  };
}

describe("AttentionSummary", () => {
  it("renders nothing when empty", () => {
    const { container } = render(<AttentionSummary />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when given only empty arrays", () => {
    const { container } = render(<AttentionSummary reasons={[]} signals={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders health chip when provided", () => {
    render(<AttentionSummary health={{ label: "Degraded", tone: "error" }} />);
    expect(screen.getByText("Degraded")).toBeTruthy();
  });

  it("renders attention reasons as chips", () => {
    render(
      <AttentionSummary
        health={{ label: "Degraded", tone: "error" }}
        reasons={[
          { label: "ProgressDeadlineExceeded", severity: "error" },
          { label: "0/3 available", severity: "warning" },
        ]}
      />,
    );
    expect(screen.getByText("ProgressDeadlineExceeded")).toBeTruthy();
    expect(screen.getByText("0/3 available")).toBeTruthy();
  });

  it("renders top 3 signals and counts overflow", () => {
    const signals: DashboardSignalItem[] = [
      signal({ reason: "first" }),
      signal({ reason: "second" }),
      signal({ reason: "third" }),
      signal({ reason: "fourth" }),
      signal({ reason: "fifth" }),
    ];
    render(<AttentionSummary signals={signals} />);
    expect(screen.getByText(/first/)).toBeTruthy();
    expect(screen.getByText(/second/)).toBeTruthy();
    expect(screen.getByText(/third/)).toBeTruthy();
    expect(screen.queryByText(/fourth/)).toBeNull();
    expect(screen.getByText("+2 more signals")).toBeTruthy();
  });

  it("shows Signals count chip with worst severity", () => {
    const signals: DashboardSignalItem[] = [
      signal({ severity: "low", reason: "info-ish" }),
      signal({ severity: "high", reason: "critical" }),
      signal({ severity: "medium", reason: "warn-ish" }),
    ];
    render(<AttentionSummary signals={signals} />);
    expect(screen.getByText("Signals: 3")).toBeTruthy();
  });

  it("renders and invokes jump handlers", () => {
    const onEvents = vi.fn();
    const onConditions = vi.fn();
    const onSpec = vi.fn();
    render(
      <AttentionSummary
        health={{ label: "Degraded" }}
        onJumpToEvents={onEvents}
        onJumpToConditions={onConditions}
        onJumpToSpec={onSpec}
      />,
    );

    fireEvent.click(screen.getByText("Conditions"));
    fireEvent.click(screen.getByText("Events"));
    fireEvent.click(screen.getByText("Spec"));
    expect(onConditions).toHaveBeenCalledTimes(1);
    expect(onEvents).toHaveBeenCalledTimes(1);
    expect(onSpec).toHaveBeenCalledTimes(1);
  });

  it("hides jump chips when handlers are not supplied", () => {
    render(<AttentionSummary health={{ label: "Degraded" }} />);
    expect(screen.queryByText("Conditions")).toBeNull();
    expect(screen.queryByText("Events")).toBeNull();
    expect(screen.queryByText("Spec")).toBeNull();
  });

  it("shows signal severity before its reason text", () => {
    render(
      <AttentionSummary
        signals={[
          signal({ severity: "high", reason: "ImagePullBackOff", actualData: "ImagePullBackOff: myimg" }),
        ]}
      />,
    );
    const row = screen.getByText(/ImagePullBackOff: myimg/).closest("p");
    expect(row).toBeTruthy();
    if (row) {
      expect(within(row as HTMLElement).getByText("high")).toBeTruthy();
    }
  });
});
