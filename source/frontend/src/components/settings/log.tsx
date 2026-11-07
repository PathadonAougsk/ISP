"use client";

import { useEffect, useRef, useState } from "react";

import { getAuditLogs, type AuditLog } from "@/lib/audit_log";
import { formatShortDateTime } from "@/lib/format";
import {
  BTN,
  ERROR,
  FIELD,
  HEAD,
  LIST_PANEL,
  MESSAGE,
  MUTED,
  ROW,
  SELECT,
  TITLE,
} from "./settings-style";

// The log is written by hand, one row per changed column, by whichever endpoint
// made the change so these are the only tables that can show up.
const TABLES = ["account", "category", "ticket", "task"];

// One screenful. The server caps `limit` at 500 either way.
const PAGE_SIZE = 100;

// A deleted account leaves by_whom null, and a create or a delete leaves one
// side of the change null, so neither of those is an error worth shouting about.
const DASH = "-";

function valueOf(value: string | null) {
  return value === null || value === "" ? DASH : value;
}

export default function Log({
  isAdmin,
  accountLoading,
}: {
  isAdmin: boolean;
  accountLoading: boolean;
}) {
  const [entries, setEntries] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [table, setTable] = useState("");

  // Which filter the rows on screen came from, null before the first fetch.
  // Loading is derived from it, so a new filter cannot show the old rows.
  const [loadedTable, setLoadedTable] = useState<string | null>(null);
  const loading = loadedTable !== table;

  // A full page back means there is probably another one behind it.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bumped by the cleanup below, and shared with "Load more" so a response
  // from before the filter changed knows it is stale and drops itself.
  const requestId = useRef(0);

  // Refetches whenever the table filter changes - the filter is applied by the
  // server, so it covers the whole log and not just the page already in hand.
  // The server already refuses a Lab User, so dont spend a request on a 403.
  useEffect(() => {
    if (!isAdmin) return;
    const id = requestId.current;

    getAuditLogs({ limit: PAGE_SIZE, from_table: table || undefined })
      .then((body) => {
        if (requestId.current !== id) return;
        setEntries(body.AuditLogs);
        setHasMore(body.AuditLogs.length === PAGE_SIZE);
        setError(null);
      })
      .catch((err) => {
        if (requestId.current !== id) return;
        setEntries([]);
        setHasMore(false);
        setError(err instanceof Error ? err.message : "Could not load the log.");
      })
      .finally(() => {
        // Clears the loading state - on an error too, the message takes over.
        if (requestId.current === id) setLoadedTable(table);
      });

    return () => {
      requestId.current += 1;
    };
  }, [isAdmin, table]);

  // Keyset would be steadier, but offset matches the endpoint we have. A new
  // entry on top shifts every page down, so drop rows already in hand.
  async function loadMore() {
    const id = requestId.current;
    setLoadingMore(true);
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
      // On what the server sent, not on what survived the dedupe.
      setHasMore(AuditLogs.length === PAGE_SIZE);
      setError(null);
    } catch (err) {
      if (requestId.current !== id) return;
      setError(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      // Unconditional - a stale run still has to let go of the button.
      setLoadingMore(false);
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = entries.filter((entry) =>
    [
      entry.by_username,
      entry.from_table,
      entry.column_name,
      entry.row_id,
      entry.old_value,
      entry.new_value,
    ].some((field) => field?.toLowerCase().includes(needle)),
  );

  return (
    <section className="flex flex-col gap-7">
      <h1 className={TITLE}>Log</h1>

      <div className="flex flex-col gap-1.5">
        <p className="font-semibold">Every Change Made In Your Lab</p>
        <p className={MUTED}>
          One line per changed column, newest first. Nothing here can be edited
          or removed.
        </p>
      </div>

      {accountLoading ? (
        <p className={MUTED}>Loading...</p>
      ) : !isAdmin ? (
        <p className={MUTED}>
          Only a Lab Owner or Lab Admin can read the log.
        </p>
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
              <select
                value={table}
                onChange={(e) => setTable(e.target.value)}
                className={`${SELECT} w-32.5`}
              >
                <option value="">All tables</option>
                {TABLES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this page"
                className={`${FIELD} w-62.5`}
              />
            </div>
          </div>

          {error && <p className={ERROR}>{error}</p>}

          {/* Six columns, hence text-sm rows and a title on every column that
              can truncate. Only account row_ids are UUIDs - category, ticket
              and task ids are small integers. */}
          <div className={LIST_PANEL}>
            <div className={HEAD}>
              <span className="w-15 shrink-0">Row</span>
              <span className="w-50 shrink-0">When</span>
              <span className="w-27.5 shrink-0">Who</span>
              <span className="w-20 shrink-0">Table</span>
              <span className="w-22.5 shrink-0">Column</span>
              <span className="flex-1">Change</span>
            </div>

            {loading ? (
              <p className={MESSAGE}>Loading...</p>
            ) : visible.length === 0 ? (
              <p className={MESSAGE}>
                {entries.length === 0
                  ? "Nothing has been logged yet."
                  : "No entries match that search."}
              </p>
            ) : (
              visible.map((entry) => (
                <div key={entry.id} className={`${ROW} text-sm`}>
                  <span
                    className="w-15 shrink-0 truncate"
                    title={entry.row_id ?? undefined}
                  >
                    {valueOf(entry.row_id)}
                  </span>
                  <span className="w-50 shrink-0">
                    {formatShortDateTime(entry.occurred_at)}
                  </span>
                  <span
                    className="w-27.5 shrink-0 truncate"
                    title={entry.by_username ?? undefined}
                  >
                    {entry.by_username ?? (
                      <span className="text-gray-500">Deleted account</span>
                    )}
                  </span>
                  <span className="w-20 shrink-0">{entry.from_table}</span>
                  <span
                    className="w-22.5 shrink-0 truncate"
                    title={entry.column_name}
                  >
                    {entry.column_name}
                  </span>
                  <span
                    className="flex-1 truncate"
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

          {hasMore && !loading && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className={`${BTN} w-full`}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
