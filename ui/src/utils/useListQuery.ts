import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiError } from "../api";
import { toApiError } from "../api";
import type { DataplaneListMeta, ResourceListFetchResult } from "../types/api";
import { useConnectionState } from "../connectionState";

type UseListQueryOptions<T> = {
  enabled?: boolean;
  /** Poll interval in seconds for full list refetch. When > 0, overrides revision-based polling. */
  refreshSec: number;
  fetchItems: () => Promise<ResourceListFetchResult<T>>;
  onInitialResult?: () => void;
  /** Map last-fetched rows for display (e.g. merge progressive enrichment). */
  mapRows?: (rows: T[]) => T[];
  /** Dependencies that should trigger re-mapping without refetching. */
  mapRowsDeps?: unknown[];
  /**
   * When set and refreshSec is 0, poll only this lightweight revision endpoint on revisionPollSec;
   * full fetchItems runs on mount, on connection recovery, on manual refetch, and when revision changes.
   */
  fetchRevision?: () => Promise<string>;
  /** Seconds between revision polls when fetchRevision is used without full refreshSec. Default 2. */
  revisionPollSec?: number;
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
  fetchRevision,
  revisionPollSec = 0,
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

  const fetchItemsRef = useRef(fetchItems);
  const fetchRevisionRef = useRef(fetchRevision);
  useEffect(() => {
    fetchItemsRef.current = fetchItems;
  }, [fetchItems]);
  useEffect(() => {
    fetchRevisionRef.current = fetchRevision;
  }, [fetchRevision]);

  const lastRevisionRef = useRef<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchItemsRef.current();
      setFetchedRows(next.rows);
      setDataplaneMeta(next.dataplaneMeta ?? null);
      setLastRefresh(new Date());
      onInitialResultRef.current?.();
      const fr = fetchRevisionRef.current;
      if (fr) {
        try {
          lastRevisionRef.current = await fr();
        } catch {
          lastRevisionRef.current = null;
        }
      } else {
        lastRevisionRef.current = null;
      }
    } catch (err) {
      setFetchedRows([]);
      setDataplaneMeta(null);
      onInitialResultRef.current?.();
      lastRevisionRef.current = null;
      setError(toApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

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
        const next = await fetchItemsRef.current();
        setFetchedRows(next.rows);
        setDataplaneMeta(next.dataplaneMeta ?? null);
        setLastRefresh(new Date());
        setError(null);
        const fr = fetchRevisionRef.current;
        if (fr) {
          try {
            lastRevisionRef.current = await fr();
          } catch {
            /* keep previous revision marker */
          }
        }
      } catch {
        // keep previous data on refresh error
      }
    }, refreshSec * 1000);
    return () => clearInterval(t);
  }, [enabled, refreshSec, fetchItems]);

  useEffect(() => {
    if (!enabled || loading) return;
    if (refreshSec > 0) return;
    const fr = fetchRevisionRef.current;
    if (!fr || revisionPollSec <= 0) return;

    const tick = async () => {
      try {
        const rev = await fr();
        const prev = lastRevisionRef.current;
        if (prev === null) {
          lastRevisionRef.current = rev;
          return;
        }
        if (prev !== rev) {
          lastRevisionRef.current = rev;
          const next = await fetchItemsRef.current();
          setFetchedRows(next.rows);
          setDataplaneMeta(next.dataplaneMeta ?? null);
          setLastRefresh(new Date());
          setError(null);
        }
      } catch {
        // keep previous data
      }
    };

    const t = setInterval(() => void tick(), revisionPollSec * 1000);
    return () => clearInterval(t);
  }, [enabled, loading, refreshSec, revisionPollSec, fetchRevision]);

  return { items, dataplaneMeta, error, loading, lastRefresh, refetch: loadInitial };
}
