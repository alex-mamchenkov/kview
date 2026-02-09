type ChipColor = "success" | "warning" | "error" | "default";

export function phaseChipColor(phase?: string | null): ChipColor {
  switch (phase) {
    case "Running":
      return "success";
    case "Pending":
      return "warning";
    case "Failed":
      return "error";
    case "Succeeded":
      return "default";
    default:
      return "default";
  }
}

export function eventChipColor(kind?: string | null): ChipColor {
  switch (kind) {
    case "Normal":
      return "success";
    case "Warning":
      return "warning";
    default:
      return "default";
  }
}

export function conditionStatusColor(status?: string | null): ChipColor {
  if (status === "True") return "success";
  if (status === "False") return "error";
  if (status === "Unknown") return "warning";
  return "default";
}

export function statusChipColor(status?: string | null): ChipColor {
  switch (status) {
    case "Available":
      return "success";
    case "Progressing":
      return "warning";
    case "Paused":
      return "default";
    case "ScaledDown":
      return "default";
    default:
      return "default";
  }
}

export function jobStatusChipColor(status?: string | null): ChipColor {
  switch (status) {
    case "Complete":
      return "success";
    case "Failed":
      return "error";
    case "Running":
      return "warning";
    default:
      return "default";
  }
}

export function nodeStatusChipColor(status?: string | null): ChipColor {
  switch (status) {
    case "Ready":
      return "success";
    case "NotReady":
      return "error";
    case "Unknown":
      return "warning";
    default:
      return "default";
  }
}

export function namespacePhaseChipColor(phase?: string | null): ChipColor {
  switch (phase) {
    case "Active":
      return "success";
    case "Terminating":
      return "warning";
    default:
      return "default";
  }
}

export function pvcPhaseChipColor(phase?: string | null): ChipColor {
  switch (phase) {
    case "Bound":
      return "success";
    case "Pending":
      return "warning";
    case "Lost":
      return "error";
    default:
      return "default";
  }
}

export function pvPhaseChipColor(phase?: string | null): ChipColor {
  switch (phase) {
    case "Available":
      return "success";
    case "Bound":
      return "success";
    case "Released":
      return "warning";
    case "Failed":
      return "error";
    default:
      return "default";
  }
}
