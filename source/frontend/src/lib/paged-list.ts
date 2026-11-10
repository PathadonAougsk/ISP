"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLookups, type Lookups } from "@/lib/lookup";
import { PAGE_SIZE, pageParams, splitPage } from "@/lib/pagination";

export type PagedList<Row> = {
  rows: Row[];
  hasNext: boolean;
  totalPages: number;
  // also true on the render right after a page change, so a stale page never shows
  loading: boolean;
  error: string | null;
  reload: () => void;
};

type State<Row> = {
  rows: Row[];
  hasNext: boolean;
  totalPages: number;
  loading: boolean;
  error: string | null;
  // page the rows came from. differ from page = rows are stale
  loadedPage: number;
};

const INITIAL: State<never> = {
  rows: [],
  hasNext: false,
  totalPages: 0,
  loading: true,
  error: null,
  loadedPage: 0,
};

// One page of a server filtered list, as the request table renders it.
// `fetchPage` asks for one row more than the page holds, so we know whether a
// next page exists, and the name lookups load alongside it. `deps` are the
// filter values: a change to any of them refetches.
export function usePagedList<Raw, Row>(
  page: number,
  enabled: boolean,
  deps: unknown[],
  fetchPage: (params: {
    limit: number;
    offset: number;
  }) => Promise<{ items: Raw[]; count: number }>,
  mapRow: (raw: Raw, lookups: Lookups) => Row,
  fallbackError: string,
): PagedList<Row> {
  const [state, setState] = useState<State<Row>>(INITIAL);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // latest closures, so the effect only watches the values that matter
  const fetchRef = useRef(fetchPage);
  const mapRef = useRef(mapRow);

  useEffect(() => {
    fetchRef.current = fetchPage;
    mapRef.current = mapRow;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true }));

    Promise.all([fetchRef.current(pageParams(page)), loadLookups()])
      .then(([body, lookups]) => {
        if (cancelled) return;

        const { rows, hasNext } = splitPage(body.items);

        setState({
          rows: rows.map((raw) => mapRef.current(raw, lookups)),
          hasNext,
          totalPages: Math.ceil(body.count / PAGE_SIZE),
          loading: false,
          error: null,
          loadedPage: page,
        });
      })
      .catch((err) => {
        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : fallbackError,
          loadedPage: page,
        }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, page, reloadKey, fallbackError, ...deps]);

  return {
    rows: state.rows,
    hasNext: state.hasNext,
    totalPages: state.totalPages,
    loading: state.loading || state.loadedPage !== page,
    error: state.error,
    reload,
  };
}
