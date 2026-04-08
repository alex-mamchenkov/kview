import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { apiGetWithContext } from "../../api";
import type { ApiDataplaneSearchItem, ApiDataplaneSearchResponse } from "../../types/api";
import { getResourceLabel, type ListResourceKey } from "../../utils/k8sResources";

const SEARCH_PAGE_SIZE = 10;

type Props = {
  token: string;
  activeContext: string;
  disabled?: boolean;
  onOpenResult: (item: ApiDataplaneSearchItem) => void;
};

function labelForKind(kind: string): string {
  if (kind === "helmreleases") return "Helm Releases";
  return getResourceLabel(kind as ListResourceKey);
}

function resultSecondary(item: ApiDataplaneSearchItem): string {
  const scope = item.namespace ? `${item.cluster} / ${item.namespace}` : item.cluster;
  return `${labelForKind(item.kind)} · ${scope || "cached dataplane"}`;
}

export default function DataplaneQuickSearch({ token, activeContext, disabled, onOpenResult }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ApiDataplaneSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2 && !!activeContext && !disabled;

  const fetchResults = React.useCallback((offset: number, append: boolean) => {
    const path = `/api/dataplane/search?q=${encodeURIComponent(trimmed)}&limit=${SEARCH_PAGE_SIZE}&offset=${offset}`;
    return apiGetWithContext<ApiDataplaneSearchResponse>(path, token, activeContext)
      .then((res) => {
        setItems((prev) => append ? [...prev, ...(res.items || [])] : (res.items || []));
        setHasMore(!!res.hasMore);
        setError("");
        setOpen(true);
      });
  }, [activeContext, token, trimmed]);

  useEffect(() => {
    let cancelled = false;
    if (!canSearch) {
      setItems([]);
      setLoading(false);
      setLoadingMore(false);
      setError("");
      setHasMore(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchResults(0, false)
        .then(() => {
          if (cancelled) return;
        })
        .catch((err) => {
          if (cancelled) return;
          setItems([]);
          setError(String((err as Error | undefined)?.message || err || "Search failed"));
          setOpen(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSearch, fetchResults]);

  const loadMore = React.useCallback(() => {
    if (!canSearch || loadingMore) return;
    setLoadingMore(true);
    fetchResults(items.length, true)
      .catch((err) => {
        setError(String((err as Error | undefined)?.message || err || "Search failed"));
      })
      .finally(() => setLoadingMore(false));
  }, [canSearch, fetchResults, items.length, loadingMore]);

  const content = useMemo(() => {
    if (!trimmed) return null;
    if (trimmed.length < 2) return <Typography variant="body2" color="text.secondary">Type at least 2 characters.</Typography>;
    if (loading) return <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CircularProgress size={16} /> Searching cached dataplane</Box>;
    if (error) return <Typography variant="body2" color="error">{error}</Typography>;
    if (items.length === 0) return <Typography variant="body2" color="text.secondary">No cached dataplane matches.</Typography>;
    return (
      <>
        <List dense disablePadding>
          {items.map((item) => (
            <ListItemButton
              key={`${item.cluster}/${item.kind}/${item.namespace || ""}/${item.name}`}
              onClick={() => {
                onOpenResult(item);
                setOpen(false);
                setQuery("");
              }}
            >
              <ListItemText primary={item.name} secondary={resultSecondary(item)} primaryTypographyProps={{ noWrap: true }} secondaryTypographyProps={{ noWrap: true }} />
            </ListItemButton>
          ))}
        </List>
        {hasMore ? (
          <Box sx={{ p: 0.75, borderTop: "1px solid", borderColor: "divider" }}>
            <Button size="small" fullWidth onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading" : "Load 10 more"}
            </Button>
          </Box>
        ) : null}
      </>
    );
  }, [error, hasMore, items, loadMore, loading, loadingMore, onOpenResult, trimmed]);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ width: { xs: 220, sm: 320, md: 420 }, mx: 1.25 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search cached dataplane"
          value={query}
          disabled={disabled || !activeContext}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            e.stopPropagation();
            setQuery("");
            setItems([]);
            setError("");
            setHasMore(false);
            setOpen(false);
          }}
          onFocus={() => setOpen(true)}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, color: "text.secondary" }} />,
            endAdornment: loading ? <CircularProgress size={16} /> : null,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              color: "#111827",
              borderRadius: 1,
              boxShadow: "0 1px 4px rgba(15,23,42,0.18)",
              "& fieldset": {
                borderColor: "rgba(255,255,255,0.7)",
              },
              "&:hover fieldset": {
                borderColor: "#fff",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#fff",
              },
            },
            "& .MuiInputBase-input::placeholder": {
              color: "#475569",
              opacity: 1,
            },
          }}
        />
        <Popper open={open && !!content} anchorEl={anchorRef.current} placement="bottom-start" sx={{ zIndex: 1500, width: anchorRef.current?.clientWidth || 420 }}>
          <Paper variant="outlined" sx={{ mt: 0.75, p: items.length > 0 && !loading && !error ? 0 : 1.25, maxHeight: 380, overflow: "auto" }}>
            {content}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
