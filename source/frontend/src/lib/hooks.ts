"use client";

import { useCallback, useEffect, useState } from "react";

// Load once on mount, ignore the result if unmounted. Pass a stable function:
// `reload` bumps a counter the effect watches, so `load` itself has to stay
// stable or the effect loops.
export function useFetched<T>(load: () => Promise<T>, enabled: boolean = true) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    load()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [load, enabled, attempt]);

  return { ...state, reload };
}
