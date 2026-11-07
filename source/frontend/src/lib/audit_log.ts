"use client";
import { apiFetch, apiDetail } from "@/lib/api";

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

// Admin only on the server, so a 403 is expected for a Lab User - the panel
// shows the server's `detail` rather than pretending the log is empty.
export async function getAuditLogs(
  query: AuditLogQuery = {},
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }

  const search = params.toString();
  const res = await apiFetch(`/audit-log/${search ? `?${search}` : ""}`);

  if (!res.ok) {
    throw new Error(await apiDetail(res, `HTTP ${res.status}`));
  }

  return res.json();
}
