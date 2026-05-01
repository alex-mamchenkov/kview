import { describe, expect, it } from "vitest";
import { eventToBinding, matchKeySequence, shouldIgnoreGlobalShortcut } from "./keyboardUtils";

describe("keyboardUtils", () => {
  it("normalizes printable shortcuts and modifiers", () => {
    expect(eventToBinding({ key: "?", shiftKey: true, ctrlKey: false, metaKey: false, altKey: false })).toBe("?");
    expect(eventToBinding({ key: ":", shiftKey: true, ctrlKey: false, metaKey: false, altKey: false })).toBe(":");
    expect(eventToBinding({ key: "k", shiftKey: false, ctrlKey: true, metaKey: false, altKey: false })).toBe("ctrl+k");
  });

  it("matches full and partial key sequences", () => {
    expect(matchKeySequence(["g", "p"], ["g"])).toBe("partial");
    expect(matchKeySequence(["g", "p"], ["g", "p"])).toBe("matched");
    expect(matchKeySequence(["g", "p"], ["g", "x"])).toBe("none");
  });

  it("does not ignore a missing target", () => {
    expect(shouldIgnoreGlobalShortcut(null)).toBe(false);
  });
});
