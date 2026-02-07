import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError } from "../api";
import { toApiError } from "../api";

type UseListQueryOptions<T> = {
  enabled?: boolean;
  refreshSec: number;
  fetchItems: () => Promise<T[]>;
  onInitialResult?: () => void;
};

type UseListQueryResult<T> = {
  items: T[];
  error: ApiError | null;
  loading: boolean;
  lastRefresh: Date | null;
  refetch: () => Promise<void>;
};

export default function useListQuery<T>({
  enabled = true,
  refreshSec,
  fetchItems,
  onInitialResult,
}: UseListQueryOptions<T>): UseListQueryResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const onInitialResultRef = useRef(onInitialResult);

  useEffect(() => {
    onInitialResultRef.current = onInitialResult;
  }, [onInitialResult]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchItems();
      setItems(next);
      setLastRefresh(new Date());
      onInitialResultRef.current?.();
    } catch (err) {
      setItems([]);
      onInitialResultRef.current?.();
      setError(toApiError(err));
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => {
    if (!enabled) return;
    void loadInitial();
  }, [enabled, loadInitial]);

  useEffect(() => {
    if (!enabled || refreshSec <= 0) return;
    const t = setInterval(async () => {
      try {
        const next = await fetchItems();
        setItems(next);
        setLastRefresh(new Date());
        setError(null);
      } catch {
        // keep previous data on refresh error
      }
    }, refreshSec * 1000);
    return () => clearInterval(t);
  }, [enabled, refreshSec, fetchItems]);

  return { items, error, loading, lastRefresh, refetch: loadInitial };
}
