import React from "react";
import { listSignalSeverityColor } from "../../utils/k8sUi";
import ScopedCountChip from "./ScopedCountChip";
import StatusChip from "./StatusChip";

function listSignalTitle(severity?: string | null): string {
  const normalized = (severity || "").toLowerCase();
  if (!normalized || normalized === "ok") return "OK";
  return normalized[0].toUpperCase() + normalized.slice(1);
}

export default function ListSignalChip({ severity, count }: { severity?: string | null; count?: number | null }) {
  const title = listSignalTitle(severity);
  const signalCount = Number(count || 0);
  const color = listSignalSeverityColor(severity);
  if (signalCount <= 0 || title === "OK") {
    return <StatusChip size="small" label={title} color={color} />;
  }
  return <ScopedCountChip size="small" density="compact" label={title} count={signalCount} color={color} />;
}
