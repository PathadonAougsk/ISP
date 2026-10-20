"use client";

import { useEffect, useState } from "react";

import { getAuditLogs, type AuditLog } from "@/lib/audit_log";
import { formatShortDateTime } from "@/lib/format";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [table, setTable] = useState("");

  // A full page back means there is probably another one behind it.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refetches whenever the table filter changes - the filter is applied by the
  // server, so it covers the whole log and not just the page already in hand.
  // The server already refuses a Lab User, so dont spend a request on a 403.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    getAuditLogs({ limit: PAGE_SIZE, from_table: table || undefined })
      .then((body) => {
        if (cancelled) return;
        setEntries(body.AuditLogs);
        setHasMore(body.AuditLogs.length === PAGE_SIZE);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setEntries([]);
        setHasMore(false);
        setError(err instanceof Error ? err.message : "Could not load the log.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, table]);

  // Keyset would be steadier, but offset matches the endpoint we have.
  async function loadMore() {
    setLoadingMore(true);
    try {
      const { AuditLogs } = await getAuditLogs({
        limit: PAGE_SIZE,
        offset: entries.length,
        from_table: table || undefined,
      });

      setEntries((current) => [...current, ...AuditLogs]);
      setHasMore(AuditLogs.length === PAGE_SIZE);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more.");
    } finally {
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
      <h2 className="text-[28px] leading-tight">Log</h2>

      <div className="flex flex-col gap-1.5">
        <p>Every Change Made In Your Lab</p>
        <p className="text-[#8a8a8a]">
          One line per changed column, newest first. Nothing here can be edited
          or removed.
        </p>
      </div>

      {accountLoading ? (
        <p className="text-[#8a8a8a]">Loading...</p>
      ) : !isAdmin ? (
        <p className="text-[#8a8a8a]">
          Only a Lab Owner or Lab Admin can read the log.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg">
              All Entries
              {!loading && !error && (
                <span className="text-[#8a8a8a]">
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
                className="h-10 w-32.5 border border-[#d0d0d0] bg-[#dedede] px-2 outline-none"
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
                className="h-10 w-62.5 border border-[#d0d0d0] bg-[#dedede] px-3 outline-none placeholder:text-[#8a8a8a]"
              />
            </div>
          </div>

          {error && <p className="text-[#b3261e]">{error}</p>}

          <div className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-[#d0d0d0] pb-2 text-sm text-[#8a8a8a] uppercase">
              <span className="w-57.5 shrink-0">When</span>
              <span className="w-32.5 shrink-0">Who</span>
              <span className="w-20 shrink-0">Table</span>
              <span className="w-27.5 shrink-0">Column</span>
              <span className="flex-1">Change</span>
            </div>

            {loading ? (
              <p className="py-4 text-[#8a8a8a]">Loading...</p>
            ) : visible.length === 0 ? (
              <p className="py-4 text-[#8a8a8a]">
                {entries.length === 0
                  ? "Nothing has been logged yet."
                  : "No entries match that search."}
              </p>
            ) : (
              visible.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 border-b border-[#e0e0e0] py-3"
                >
                  <span className="w-57.5 shrink-0">
                    {formatShortDateTime(entry.occurred_at)}
                  </span>
                  <span
                    className="w-32.5 shrink-0 truncate"
                    title={entry.row_id ?? undefined}
                  >
                    {entry.by_username ?? (
                      <span className="text-[#8a8a8a]">Deleted account</span>
                    )}
                  </span>
                  <span className="w-20 shrink-0">{entry.from_table}</span>
                  <span className="w-27.5 shrink-0 truncate">
                    {entry.column_name}
                  </span>
                  <span className="flex-1 truncate">
                    <span className="text-[#8a8a8a]">
                      {valueOf(entry.old_value)}
                    </span>
                    <span className="px-2 text-[#8a8a8a]">&rarr;</span>
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
              className="h-10 w-full bg-[#d4d4d4] text-base hover:bg-[#c8c8c8] disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
