export type QuickFilter = { id: string; label: string; value: string };

export type QuickFilterPattern = { re: RegExp; label: (m: RegExpMatchArray) => string };

export const defaultQuickFilterPatterns: QuickFilterPattern[] = [
  { re: /^(master|release|test|dev).*$/i, label: (m) => m[1].toLowerCase() },
  { re: /^([^\s-]+-[^\s-]+)-.+$/, label: (m) => m[1] },
];

export function buildQuickFilters<T>(
  rows: T[],
  getKey: (row: T) => string,
  patterns: QuickFilterPattern[] = defaultQuickFilterPatterns,
  minCount = 3,
): QuickFilter[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const name = getKey(row) || "";
    for (const pattern of patterns) {
      const match = name.match(pattern.re);
      if (match) {
        const key = pattern.label(match);
        if (key) counts.set(key, (counts.get(key) || 0) + 1);
        break;
      }
    }
  }

  return Array.from(counts.entries())
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([k, c]) => ({ id: k, label: `${k} (${c})`, value: k }));
}

export const refreshOptions = [
  { label: "Off", value: 0 },
  { label: "3s", value: 3 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
];
