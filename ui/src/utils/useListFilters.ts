import { useCallback, useEffect, useMemo, useState } from "react";
import { loadListTextFilter, loadQuickFilterSelection, saveListTextFilter, saveQuickFilterSelection } from "../state";
import type { QuickFilter, QuickFilterPattern } from "./listFilters";
import { buildQuickFilters, defaultQuickFilterPatterns } from "./listFilters";

type UseListFiltersOptions<T> = {
  rows: T[];
  lastRefresh: Date | null;
  filterPredicate: (row: T, query: string) => boolean;
  getQuickFilterKey?: (row: T) => string;
  quickFilterPatterns?: QuickFilterPattern[];
  minQuickFilterCount?: number;
};

type UseListFiltersResult<T> = {
  filter: string;
  setFilter: (value: string) => void;
  selectedQuickFilter: string | null;
  setSelectedQuickFilter: (value: string | null) => void;
  toggleQuickFilter: (value: string) => void;
  quickFilters: QuickFilter[];
  filteredRows: T[];
};

export default function useListFilters<T>({
  rows,
  lastRefresh,
  filterPredicate,
  getQuickFilterKey = (row: any) => String(row?.name ?? ""),
  quickFilterPatterns = defaultQuickFilterPatterns,
  minQuickFilterCount = 3,
}: UseListFiltersOptions<T>): UseListFiltersResult<T> {
  const [filter, setFilterRaw] = useState<string>(() => loadListTextFilter());

  const quickFilters = useMemo(
    () => buildQuickFilters(rows, getQuickFilterKey, quickFilterPatterns, minQuickFilterCount),
    [rows, getQuickFilterKey, quickFilterPatterns, minQuickFilterCount],
  );

  // Derive: quick filter is highlighted iff filter exactly equals its value
  const selectedQuickFilter = useMemo(() => {
    const match = quickFilters.find((q) => q.value === filter);
    return match ? match.value : null;
  }, [quickFilters, filter]);

  // On data refresh, validate persisted quick filter still exists in available set
  useEffect(() => {
    if (!lastRefresh) return;
    const stored = loadQuickFilterSelection();
    if (stored.length === 0) return;
    const available = new Set(quickFilters.map((q) => q.value));
    if (available.has(stored[0])) {
      // Stored quick filter still available — ensure filter text matches
      if (filter !== stored[0]) {
        setFilterRaw(stored[0]);
        saveListTextFilter(stored[0]);
      }
    } else {
      // Stored quick filter no longer available — clear it
      saveQuickFilterSelection([]);
    }
    // Only re-run when quickFilters set or lastRefresh changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickFilters, lastRefresh]);

  const setFilter = useCallback((value: string) => {
    setFilterRaw(value);
    saveListTextFilter(value);
  }, []);

  const setSelectedQuickFilter = useCallback(
    (value: string | null) => {
      const newFilter = value ?? "";
      setFilterRaw(newFilter);
      saveListTextFilter(newFilter);
      saveQuickFilterSelection(value ? [value] : []);
    },
    [],
  );

  const toggleQuickFilter = useCallback(
    (value: string) => {
      if (filter === value) {
        // Toggle off
        setFilterRaw("");
        saveListTextFilter("");
        saveQuickFilterSelection([]);
      } else {
        // Toggle on
        setFilterRaw(value);
        saveListTextFilter(value);
        saveQuickFilterSelection([value]);
      }
    },
    [filter],
  );

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => filterPredicate(row, q));
  }, [rows, filter, filterPredicate]);

  return {
    filter,
    setFilter,
    selectedQuickFilter,
    setSelectedQuickFilter,
    toggleQuickFilter,
    quickFilters,
    filteredRows,
  };
}
