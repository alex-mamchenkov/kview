export function fmtTs(unix?: number | null): string {
  if (!unix) return "-";
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

export function valueOrDash(val?: string | number | null): string {
  if (val === undefined || val === null || val === "") return "-";
  return String(val);
}

export function fmtAge(seconds?: number, style: "detail" | "table" = "detail"): string {
  if (style === "table") {
    if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "-";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  if (!seconds || seconds < 0) return "-";
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return `${seconds}s`;
  const hours = Math.floor(mins / 60);
  if (hours < 1) return `${mins}m`;
  const days = Math.floor(hours / 24);
  if (days < 1) return `${hours}h`;
  return `${days}d`;
}
