// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import useListQuery from "./useListQuery";
import React from "react";

vi.mock("./connectionState", () => ({
  useConnectionState: () => ({ retryNonce: 0 }),
}));

describe("useListQuery revision polling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not refetch full list when revision is unchanged", async () => {
    const fetchItems = vi.fn().mockResolvedValue({ rows: [{ id: "1", name: "a" }] });
    const fetchRevision = vi.fn().mockResolvedValue("5");

    const wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

    const { result } = renderHook(
      () =>
        useListQuery({
          enabled: true,
          refreshSec: 0,
          fetchItems,
          fetchRevision,
          revisionPollSec: 1,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchItems).toHaveBeenCalledTimes(1);
    expect(fetchRevision).toHaveBeenCalled();

    fetchItems.mockClear();
    fetchRevision.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(fetchRevision.mock.calls.length).toBeGreaterThan(0);
    expect(fetchItems).not.toHaveBeenCalled();
  });

  it("refetches full list when revision changes", async () => {
    const fetchItems = vi.fn().mockResolvedValue({ rows: [{ id: "1", name: "a" }] });
    let rev = "1";
    const fetchRevision = vi.fn().mockImplementation(async () => rev);

    const wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

    const { result } = renderHook(
      () =>
        useListQuery({
          enabled: true,
          refreshSec: 0,
          fetchItems,
          fetchRevision,
          revisionPollSec: 1,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchItems).toHaveBeenCalledTimes(1);

    rev = "2";
    fetchItems.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    await waitFor(() => expect(fetchItems).toHaveBeenCalledTimes(1));
  });
});
