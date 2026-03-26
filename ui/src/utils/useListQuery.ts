import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiError } from "../api";
import { toApiError } from "../api";
import type { DataplaneListMeta, ResourceListFetchResult } from "../types/api";
import { useConnectionState } from "../connectionState";

type UseListQueryOptions<T> = {
  enabled?: boolean;
  /** Poll interval in seconds; 0 disables periodic refetch (manual refetch / connection retry still run). */
  refreshSec: number;
  fetchItems: () => Promise<ResourceListFetchResult<T>>;
  onInitialResult?: () => void;
  /** Map last-fetched rows for display (e.g. merge progressive enrichment). */
  mapRows?: (rows: T[]) => T[];
  /** Dependencies that should trigger re-mapping without refetching. */
  mapRowsDeps?: unknown[];
};

type UseListQueryResult<T> = {
  items: T[];
  dataplaneMeta: DataplaneListMeta | null;
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
  mapRows,
  mapRowsDeps,
}: UseListQueryOptions<T>): UseListQueryResult<T> {
  const [fetchedRows, setFetchedRows] = useState<T[]>([]);
  const [dataplaneMeta, setDataplaneMeta] = useState<DataplaneListMeta | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { retryNonce } = useConnectionState();

  const onInitialResultRef = useRef(onInitialResult);

  useEffect(() => {
    onInitialResultRef.current = onInitialResult;
  }, [onInitialResult]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchItems();
      setFetchedRows(next.rows);
      setDataplaneMeta(next.dataplaneMeta ?? null);
      setLastRefresh(new Date());
      onInitialResultRef.current?.();
    } catch (err) {
      setFetchedRows([]);
      setDataplaneMeta(null);
      onInitialResultRef.current?.();
      setError(toApiError(err));
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  const mapRowsRef = useRef(mapRows);
  useEffect(() => {
    mapRowsRef.current = mapRows;
  }, [mapRows]);

  const items = useMemo(() => {
    const fn = mapRowsRef.current;
    if (!fn) return fetchedRows;
    return fn(fetchedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapRowsDeps mirrors caller intent
  }, [fetchedRows, mapRows, ...(mapRowsDeps ?? [])]);

  useEffect(() => {
    if (!enabled) return;
    void loadInitial();
  }, [enabled, loadInitial, retryNonce]);

  useEffect(() => {
    if (!enabled || refreshSec <= 0) return;
    const t = setInterval(async () => {
      try {
        const next = await fetchItems();
        setFetchedRows(next.rows);
        setDataplaneMeta(next.dataplaneMeta ?? null);
        setLastRefresh(new Date());
        setError(null);
      } catch {
        // keep previous data on refresh error
      }
    }, refreshSec * 1000);
    return () => clearInterval(t);
  }, [enabled, refreshSec, fetchItems]);

  return { items, dataplaneMeta, error, loading, lastRefresh, refetch: loadInitial };
}
