type ChipColor = "success" | "warning" | "error" | "default";

export function phaseChipColor(phase: string): ChipColor {
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

export function eventChipColor(kind: string): ChipColor {
  switch (kind) {
    case "Normal":
      return "success";
    case "Warning":
      return "warning";
    default:
      return "default";
  }
}

export function conditionStatusColor(status: string): ChipColor {
  if (status === "True") return "success";
  if (status === "False") return "error";
  if (status === "Unknown") return "warning";
  return "default";
}

export function statusChipColor(status: string): ChipColor {
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
