"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiSendJson } from "@/lib/api";
import { getAccounts, type UserRole } from "@/lib/account";
import { getCategories } from "@/lib/category";
import { formatShortDateTime } from "@/lib/format";
import { cached } from "@/lib/cache";

export type TicketStatus = "pending" | "accepted" | "rejected" | (string & {});

// Shape returned by the backend
export type Ticket = {
  id: number;
  status: TicketStatus;
  name: string;
  description: string | null;
  category_id: number;
  created_by: string;
  assigned_id: string | null;
  completed_by: string | null;
  created: string;
  updated: string;
  due_date: string | null;
  completed_at: string | null;
};

export type TicketsResponse = { Tickets: Ticket[] };

export type GetTicketsParams = {
  ticket_id?: number;
  status?: TicketStatus;
  category_id?: number;
  /** ISO 8601 string, e.g. new Date().toISOString() — FastAPI parses it into a datetime. */
  due_before?: string;
  onlyOwned?: boolean;
  limit?: number;
};

// Body for POST /ticket/ (TicketCreate in the backend)
export type TicketCreatePayload = {
  name: string;
  category_id: number;
  description?: string | null;
  due_date?: string | null;
};

// Body for PUT /ticket/{id} (TicketUpdate in the backend, every field optional)
export type TicketUpdatePayload = Partial<TicketCreatePayload> & {
  status?: TicketStatus;
};

// Shape the request-table UI renders
export type TicketRow = {
  id: string;
  title: string;
  status: "Pending" | "Approved" | "Rejected";
  dueDate: string;
  createdDate: string;
  lastUpdate: string;
  category: string;
  description: string;
  createdBy: string;
  assignedTo: string;
  categoryId: number;
  createdById: string;
};

export async function fetchTickets(
  params: GetTicketsParams = {},
): Promise<TicketsResponse> {
  const { ticket_id, status, category_id, due_before, onlyOwned, limit } =
    params;
  const query = new URLSearchParams();

  if (ticket_id !== undefined) query.set("ticket_id", String(ticket_id));
  if (status !== undefined) query.set("status", status);
  if (category_id !== undefined) query.set("category_id", String(category_id));
  if (due_before !== undefined) query.set("due_before", due_before);
  if (onlyOwned !== undefined) query.set("onlyOwned", String(onlyOwned));
  if (limit !== undefined) query.set("limit", String(limit));

  const qs = query.toString();
  const res = await apiFetch(`/ticket/${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const getTickets = cached(fetchTickets, 0);

export async function postTicket(body: TicketCreatePayload): Promise<Ticket> {
  const res = await apiSendJson("/ticket/", "POST", body);

  if (res.status === 403) {
    const err = await res.json().catch(() => null);
    if (err?.detail?.code === "quota_exhausted") {
      throw new Error("You've used up your ticket quota.");
    }
    throw new Error("You don't have permission to create a ticket.");
  }
  if (res.status === 404) {
    throw new Error("Selected category no longer exists.");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

export async function putTicket(
  id: number | string,
  body: TicketUpdatePayload,
): Promise<Ticket> {
  const res = await apiSendJson(`/ticket/${id}`, "PUT", body);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

function mapTicketStatus(status: TicketStatus): TicketRow["status"] {
  switch (status) {
    case "accepted": return "Approved";
    case "rejected": return "Rejected";
    default: return "Pending";
  }
}

export function mapBackendTicket(
  bt: Ticket,
  categoryById: Map<number, string>,
  accountById: Map<string, string>,
): TicketRow {
  return {
    id: String(bt.id),
    title: bt.name,
    status: mapTicketStatus(bt.status),
    dueDate: formatShortDateTime(bt.due_date),
    createdDate: formatShortDateTime(bt.created),
    lastUpdate: formatShortDateTime(bt.updated),
    category: categoryById.get(bt.category_id) ?? `Category #${bt.category_id}`,
    description: bt.description ?? "",
    createdBy: accountById.get(bt.created_by) ?? bt.created_by,
    assignedTo: bt.assigned_id ? (accountById.get(bt.assigned_id) ?? bt.assigned_id) : "",
    categoryId: bt.category_id,
    createdById: bt.created_by,
  };
}

export function useTickets(userRole: UserRole, meLoading: boolean) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsReloadKey, setTicketsReloadKey] = useState(0);

  useEffect(() => {
    if (meLoading) return;
    let cancelled = false;

    async function loadTickets() {
      try {
        // limit: 0 means "no limit" on the backend
        const [ticketBody, catBody, accBody] = await Promise.all([
          getTickets(
            userRole === "Lab Admin"
              ? { limit: 50 }
              : { onlyOwned: true, limit: 0 },
          ),
          getCategories().catch(() => null),
          getAccounts().catch(() => null),
        ]);

        const categoryById = new Map<number, string>(
          (catBody?.Categories ?? []).map((c) => [c.id, c.name]),
        );
        const accountById = new Map<string, string>(
          (accBody?.Accounts ?? []).map((a) => [a.id, a.username]),
        );

        if (!cancelled) {
          setTickets(
            ticketBody.Tickets.map((t) =>
              mapBackendTicket(t, categoryById, accountById),
            ),
          );
          setTicketsError(null);
        }
      } catch (err) {
        if (!cancelled)
          setTicketsError(err instanceof Error ? err.message : "Failed to load tickets");
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    }

    loadTickets();
    return () => {
      cancelled = true;
    };
  }, [userRole, meLoading, ticketsReloadKey]);

  return { tickets, ticketsLoading, ticketsError, setTicketsReloadKey };
}
