"use client";

import { apiFetch, apiOrThrow } from "@/lib/api";
import { buildQuery } from "@/lib/query";
import { getUserId } from "@/lib/cache/cache-utils";

// One row per changed column, written by the endpoint that made the change -
// see the note in the API guide: there is no database trigger behind this.
export type AuditLog = {
  id: number;
  from_table: string;
  row_id: string | null;
  column_name: string;
  old_value: string | null;
  new_value: string | null;
  by_whom: string | null;
  // null once the account behind by_whom is deleted (by_whom is ON DELETE SET NULL).
  by_username: string | null;
  occurred_at: string;
};

export type AuditLogsResponse = {
  AuditLogs: AuditLog[];
};

export type AuditLogQuery = {
  limit?: number;
  offset?: number;
  from_table?: string;
  row_id?: string;
  by_whom?: string;
};

const CACHE_TTL = 1000;

type CacheEntry = {
  data: AuditLogsResponse;
  expiresAt: number;
};

const auditLogCache = new Map<string, CacheEntry>();

// drop all cached logs, used on sign-out
export function clearAuditLogCache() {
  auditLogCache.clear();
}

async function fetchAuditLogs(
  query: AuditLogQuery = {},
): Promise<AuditLogsResponse> {
  const qs = buildQuery(query).toString();
  const res = await apiFetch(`/audit-log/${qs ? `?${qs}` : ""}`);
  await apiOrThrow(res, `HTTP ${res.status}`);

  return res.json();
}

// normal network request, used by pagination.
export async function getAuditLogs(
  query: AuditLogQuery = {},
): Promise<AuditLogsResponse> {
  return fetchAuditLogs(query);
}

// show cached data immediately, then replace it with fresh data.
export async function loadAuditLogs(
  query: AuditLogQuery,
  onData: (data: AuditLogsResponse, stale: boolean) => void,
  onError: (error: unknown) => void,
): Promise<void> {
  try {
    const userId = await getUserId();
    const key = userId ? `${userId}:${JSON.stringify(query)}` : null;

    const cached = key ? auditLogCache.get(key) : undefined;

    // expired entries are intentionally still displayed.
    if (cached) {
      onData(cached.data, cached.expiresAt <= Date.now());
    }

    try {
      const fresh = await fetchAuditLogs(query);

      if (key) {
        auditLogCache.set(key, {
          data: fresh,
          expiresAt: Date.now() + CACHE_TTL,
        });
      }

      onData(fresh, false);
    } catch (error) {
      onError(error);
    }
  } catch (error) {
    onError(error);
  }
}
