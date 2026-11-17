"use client";

import { useEffect, useRef, useState } from "react";

import { getAuditLogs, loadAuditLogs, type AuditLog } from "@/lib/audit_log";
import { formatLogDateTime } from "@/lib/format";
import Button from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ERROR, HEAD, LIST_PANEL, MESSAGE, MUTED, ROW } from "./settings-style";

// The log is written by hand, one row per changed column, by whichever endpoint
// made the change so these are the only tables that can show up.
const TABLES = ["account", "announcement", "category", "task", "ticket"];

// One screenful. The server caps `limit` at 500 either way.
const PAGE_SIZE = 100;

// fr cols. grid! because HEAD and ROW are flex
const COLS =
  "grid! grid-cols-[minmax(5rem,0.8fr)_minmax(8rem,1.8fr)_minmax(6rem,1.2fr)_minmax(5rem,1.1fr)_minmax(5rem,1.1fr)_4fr]";

// A deleted account leaves by_whom null, and a create or a delete leaves one
// side of the change null, so neither of those is an error worth shouting about.
const DASH = "-";

function valueOf(value: string | null) {
  return value === null || value === "" ? DASH : value;
}

export default function Log({ accountLoading }: { accountLoading: boolean }) {
  const [entries, setEntries] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchingLatest, setFetchingLatest] = useState(false);

  // Which filter and refresh request the rows on screen came from.
  const [loadedTable, setLoadedTable] = useState<string | null>(null);
  const [loadedRefreshKey, setLoadedRefreshKey] = useState(-1);

  const loading = loadedTable !== table || loadedRefreshKey !== refreshKey;
  const refreshing = loading || fetchingLatest;

  // A full page back means there is probably another one behind it.
  const [hasMore, setHasMore] = useState(false);

  // Bumped by cleanup so responses from previous requests are discarded.
  const requestId = useRef(0);

  // Show cached data immediately and refresh it in the background.
  useEffect(() => {
    const id = requestId.current;

    setFetchingLatest(true);
    setLoadingMore(false);
    setError(null);
    setEntries([]);
    setHasMore(false);

    loadAuditLogs(
      { limit: PAGE_SIZE, from_table: table || undefined },
      (body, stale) => {
        if (requestId.current !== id) return;

        setEntries(body.AuditLogs);
        setHasMore(body.AuditLogs.length === PAGE_SIZE);
        setLoadedTable(table);
        setLoadedRefreshKey(refreshKey);

        if (!stale) {
          setError(null);
          setFetchingLatest(false);
        }
      },
      (err) => {
        if (requestId.current !== id) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load the activity log.",
        );
        setLoadedTable(table);
        setLoadedRefreshKey(refreshKey);
        setFetchingLatest(false);
        setLoadingMore(false);
      },
    );

    return () => {
      requestId.current += 1;
    };
  }, [table, refreshKey]);

  async function loadMore() {
    if (refreshing || loadingMore || !hasMore) return;

    const id = requestId.current;
    setLoadingMore(true);
    setError(null);

    try {
      const { AuditLogs } = await getAuditLogs({
        limit: PAGE_SIZE,
        offset: entries.length,
        from_table: table || undefined,
      });

      if (requestId.current !== id) return;

      setEntries((current) => {
        const seen = new Set(current.map((entry) => entry.id));
        const fresh = AuditLogs.filter((entry) => !seen.has(entry.id));

        return [...current, ...fresh];
      });

      // Use the server response, not the deduplicated result.
      setHasMore(AuditLogs.length === PAGE_SIZE);
    } catch (err) {
      if (requestId.current !== id) return;

      setError(
        err instanceof Error ? err.message : "Could not load more entries.",
      );
    } finally {
      if (requestId.current === id) {
        setLoadingMore(false);
      }
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="font-semibold">All Changes in Your Lab</p>
        <p className={MUTED}>
          Each entry records a change to one database field. Entries are shown
          newest first and cannot be edited or deleted.
        </p>
      </div>

      {accountLoading ? (
        <p className={MUTED}>Loading activities...</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-semibold">
              All Entries
              {!loading && !error && (
                <span className={MUTED}>
                  {" "}
                  ({entries.length}
                  {hasMore ? "+" : ""})
                </span>
              )}
            </p>

            <div className="flex items-center gap-3">
              <Select
                look="outlined"
                className="w-40"
                value={table}
                onChange={setTable}
                placeholder={{ value: "", label: "All tables" }}
                firstItem={{ value: "", label: "All tables" }}
                options={TABLES.map((name) => ({
                  value: name,
                  label: name,
                }))}
              />

              <Button
                variant={
                  loading || refreshing || loadingMore
                    ? "busy"
                    : "outline-white"
                }
                icon="/reset.svg"
                disabled={loading || refreshing || loadingMore}
                onClick={() => {
                  setRefreshKey((current) => current + 1);
                }}
                title="Refresh Log"
                busyspin
              />
            </div>
          </div>

          {error && <p className={ERROR}>{error}</p>}

          {/* Six columns, hence text-sm rows and a title on every column that
              can truncate. Only account row_ids are UUIDs - category, ticket
              and task ids are small integers. */}
          <div
            className={`${LIST_PANEL} overflow-x-auto scrollbar-thin scrollbar-gutter-stable`}
          >
            <div className="flex min-w-3xl flex-col gap-2">
              <div className={`${HEAD} ${COLS}`}>
                <span>Record ID</span>
                <span>Date and Time</span>
                <span>Changed By</span>
                <span>Table</span>
                <span>Field</span>
                <span>Change</span>
              </div>

              {loading ? (
                <p className={MESSAGE}>Loading activity...</p>
              ) : entries.length === 0 ? (
                <p className={MESSAGE}>No activity has been recorded yet.</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className={`${ROW} ${COLS} text-sm`}>
                    <span
                      className="truncate"
                      title={entry.row_id ?? undefined}
                    >
                      {valueOf(entry.row_id)}
                    </span>

                    <span>{formatLogDateTime(entry.occurred_at)}</span>

                    <span
                      className="truncate"
                      title={entry.by_username ?? undefined}
                    >
                      {entry.by_username ?? (
                        <span className="text-gray-500">Deleted User</span>
                      )}
                    </span>

                    <span className="truncate" title={entry.from_table}>
                      {entry.from_table}
                    </span>

                    <span className="truncate" title={entry.column_name}>
                      {entry.column_name}
                    </span>

                    <span
                      className="truncate"
                      title={`${valueOf(entry.old_value)} → ${valueOf(entry.new_value)}`}
                    >
                      <span className="text-gray-500">
                        {valueOf(entry.old_value)}
                      </span>
                      <span className="px-2 text-gray-500">&rarr;</span>
                      {valueOf(entry.new_value)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {hasMore && !loading && (
            <Button
              variant="outline"
              size="md"
              onClick={loadMore}
              disabled={loadingMore || refreshing}
              className="w-full font-semibold disabled:bg-gray-200"
            >
              {loadingMore ? "Loading more entries..." : "Load More"}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
