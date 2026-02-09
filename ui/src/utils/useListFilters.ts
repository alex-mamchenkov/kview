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
  const [filter, setFilterValue] = useState<string>(() => loadListTextFilter());
  const [selectedQuickFilter, setSelectedQuickFilterValue] = useState<string | null>(() => {
    const stored = loadQuickFilterSelection();
    return stored.length > 0 ? stored[0] : null;
  });

  const quickFilters = useMemo(
    () => buildQuickFilters(rows, getQuickFilterKey, quickFilterPatterns, minQuickFilterCount),
    [rows, getQuickFilterKey, quickFilterPatterns, minQuickFilterCount],
  );

  useEffect(() => {
    if (!lastRefresh) return;
    const stored = loadQuickFilterSelection();
    const available = new Set(quickFilters.map((q) => q.id));
    const next = stored.find((id) => available.has(id)) || null;

    if (next !== selectedQuickFilter) {
      setSelectedQuickFilterValue(next);
    }
    if (next && filter !== next) {
      setFilterValue(next);
    }
    if (!next && stored.length > 0) {
      saveQuickFilterSelection([]);
    }
  }, [quickFilters, selectedQuickFilter, filter, lastRefresh]);

  const setFilter = useCallback(
    (value: string) => {
      setFilterValue(value);
      saveListTextFilter(value);
      if (selectedQuickFilter && value !== selectedQuickFilter) {
        setSelectedQuickFilterValue(null);
        saveQuickFilterSelection([]);
      }
    },
    [selectedQuickFilter],
  );

  const setSelectedQuickFilter = useCallback(
    (value: string | null) => {
      setSelectedQuickFilterValue(value);
      saveQuickFilterSelection(value ? [value] : []);
      if (value && filter !== value) {
        setFilterValue(value);
        saveListTextFilter(value);
      }
    },
    [filter],
  );

  const toggleQuickFilter = useCallback(
    (value: string) => {
      if (selectedQuickFilter === value) {
        setSelectedQuickFilter(null);
        setFilter("");
        return;
      }
      setSelectedQuickFilter(value);
      setFilter(value);
    },
    [selectedQuickFilter, setSelectedQuickFilter, setFilter],
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
