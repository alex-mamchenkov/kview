import { describe, expect, it } from "vitest";
import {
  conditionStatusColor,
  dataplaneCoarseStateChipColor,
  deploymentHealthBucketColor,
  eventChipColor,
  formatChipLabel,
  helmStatusChipColor,
  jobStatusChipColor,
  listHealthHintColor,
  namespacePhaseChipColor,
  nodeStatusChipColor,
  phaseChipColor,
  pvPhaseChipColor,
  pvcPhaseChipColor,
  statusChipColor,
  type ChipColor,
} from "./k8sUi";

describe("k8sUi chip labels and colors", () => {
  it("formats compact API-ish labels without damaging already structured values", () => {
    expect(formatChipLabel(undefined)).toBe("-");
    expect(formatChipLabel("")).toBe("-");
    expect(formatChipLabel("ok")).toBe("Ok");
    expect(formatChipLabel("CPU")).toBe("CPU");
    expect(formatChipLabel("app=api")).toBe("app=api");
    expect(formatChipLabel("NotReady")).toBe("Not ready");
    expect(formatChipLabel("pending-upgrade")).toBe("Pending upgrade");
    expect(formatChipLabel("image_pull_backoff")).toBe("Image pull backoff");
  });

  it("maps pod phases", () => {
    expect(phaseChipColor("Running")).toBe("success");
    expect(phaseChipColor("Pending")).toBe("warning");
    expect(phaseChipColor("Unknown")).toBe("warning");
    expect(phaseChipColor("Failed")).toBe("error");
    expect(phaseChipColor("Succeeded")).toBe("info");
    expect(phaseChipColor("Other")).toBe("default");
  });

  it("maps common status buckets", () => {
    const cases: Array<[string | undefined, ChipColor]> = [
      ["Available", "success"],
      ["progressing", "warning"],
      ["degraded", "error"],
      ["NotReady", "error"],
      ["paused", "default"],
      [undefined, "default"],
    ];
    for (const [status, color] of cases) {
      expect(statusChipColor(status)).toBe(color);
    }
  });

  it("maps resource-specific status colors", () => {
    expect(eventChipColor("Normal")).toBe("success");
    expect(eventChipColor("Warning")).toBe("warning");
    expect(conditionStatusColor("True")).toBe("success");
    expect(conditionStatusColor("False")).toBe("error");
    expect(conditionStatusColor("Unknown")).toBe("warning");
    expect(listHealthHintColor("problem")).toBe("error");
    expect(listHealthHintColor("attention")).toBe("warning");
    expect(listHealthHintColor("ok")).toBe("success");
    expect(deploymentHealthBucketColor("healthy")).toBe("success");
    expect(deploymentHealthBucketColor("progressing")).toBe("warning");
    expect(deploymentHealthBucketColor("degraded")).toBe("error");
    expect(dataplaneCoarseStateChipColor("denied")).toBe("error");
    expect(dataplaneCoarseStateChipColor("partial_proxy")).toBe("warning");
  });

  it("maps workload and storage-specific colors", () => {
    expect(jobStatusChipColor("Complete")).toBe("success");
    expect(jobStatusChipColor("Failed")).toBe("error");
    expect(jobStatusChipColor("Running")).toBe("warning");
    expect(nodeStatusChipColor("Ready")).toBe("success");
    expect(nodeStatusChipColor("NotReady")).toBe("error");
    expect(namespacePhaseChipColor("Active")).toBe("success");
    expect(namespacePhaseChipColor("Terminating")).toBe("warning");
    expect(pvcPhaseChipColor("Bound")).toBe("success");
    expect(pvcPhaseChipColor("Pending")).toBe("warning");
    expect(pvcPhaseChipColor("Lost")).toBe("error");
    expect(pvPhaseChipColor("Available")).toBe("success");
    expect(pvPhaseChipColor("Released")).toBe("warning");
    expect(pvPhaseChipColor("Failed")).toBe("error");
  });

  it("maps Helm release statuses", () => {
    expect(helmStatusChipColor("deployed")).toBe("success");
    expect(helmStatusChipColor("superseded")).toBe("default");
    expect(helmStatusChipColor("failed")).toBe("error");
    expect(helmStatusChipColor("pending-install")).toBe("warning");
    expect(helmStatusChipColor("pending-upgrade")).toBe("warning");
    expect(helmStatusChipColor("pending-rollback")).toBe("warning");
    expect(helmStatusChipColor("uninstalling")).toBe("warning");
    expect(helmStatusChipColor("unknown")).toBe("warning");
  });
});
