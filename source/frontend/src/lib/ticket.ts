"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiSendJson } from "@/lib/api";
import { getAccounts, type UserRole } from "@/lib/account";
import { getCategories } from "@/lib/category";
import { formatShortDateTime, toDateInputValue } from "@/lib/format";
import { cached, withoutPagination } from "@/lib/cache/cache";
import { pageParams, splitPage } from "@/lib/pagination";
import { buildQuery } from "@/lib/query";

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
  due_after?: string;
  /** ISO 8601 string, e.g. new Date().toISOString() - FastAPI parses it into a datetime. */
  due_before?: string;
  onlyOwned?: boolean;
  notOwned?: boolean;
  limit?: number;
  offset?: number;
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
  status: "Pending" | "Accepted" | "Rejected";
  dueDate: string;
  dueDateValue: string; // "yyyy-MM-dd" for <input type="date">, "" if none
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
  const qs = buildQuery(params).toString();
  const res = await apiFetch(`/ticket/${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const TICKETS_CACHE_TTL = 1 * 60 * 1000;

// same filters share expiration, different limits share the same family
export const getTickets = cached(
  fetchTickets,
  TICKETS_CACHE_TTL,
  "tickets",
  withoutPagination,
);

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

  // data changed, so drop cached lists
  getTickets.clear();

  return res.json();
}

export async function putTicket(
  id: number | string,
  body: TicketUpdatePayload,
): Promise<Ticket> {
  const res = await apiSendJson(`/ticket/${id}`, "PUT", body);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // data changed, so drop cached lists
  getTickets.clear();

  return res.json();
}

function mapTicketStatus(status: TicketStatus): TicketRow["status"] {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    default:
      return "Pending";
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
    dueDateValue: toDateInputValue(bt.due_date),
    createdDate: formatShortDateTime(bt.created, "created"),
    lastUpdate: formatShortDateTime(bt.updated, "updated"),
    category: categoryById.get(bt.category_id) ?? `Category #${bt.category_id}`,
    description: bt.description ?? "",
    createdBy: accountById.get(bt.created_by) ?? "-",
    assignedTo: bt.assigned_id ? (accountById.get(bt.assigned_id) ?? "-") : "",
    categoryId: bt.category_id,
    createdById: bt.created_by,
  };
}

// fetch one ticket by id for the modal. throw if not found
export async function getTicketRowById(
  id: number,
  userRole: UserRole,
): Promise<TicketRow> {
  const [ticketBody, catBody, accBody] = await Promise.all([
    getTickets({
      ...(userRole === "Lab Admin" ? {} : { onlyOwned: true }),
      ticket_id: id,
    }),
    getCategories().catch(() => null),
    getAccounts().catch(() => null),
  ]);

  const ticket = ticketBody.Tickets.find((t) => t.id === id);
  if (!ticket) throw new Error("Ticket not found");

  const categoryById = new Map<number, string>(
    (catBody?.Categories ?? []).map((c) => [c.id, c.name]),
  );
  const accountById = new Map<string, string>(
    (accBody?.Accounts ?? []).map((a) => [a.id, a.username]),
  );

  return mapBackendTicket(ticket, categoryById, accountById);
}

export type TicketFilters = { status?: TicketStatus; categoryId?: number };

export function useTickets(
  userRole: UserRole,
  meLoading: boolean,
  page: number,
  filters: TicketFilters,
  enabled: boolean,
) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketsHasNext, setTicketsHasNext] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsReloadKey, setTicketsReloadKey] = useState(0);
  // page of the data we hold. differ from page = data is stale
  const [ticketsLoadedPage, setTicketsLoadedPage] = useState(0);

  const { status, categoryId } = filters;

  useEffect(() => {
    if (meLoading || !enabled) return;
    let cancelled = false;

    async function loadTickets() {
      setTicketsLoading(true);
      try {
        const [ticketBody, catBody, accBody] = await Promise.all([
          getTickets({
            ...(userRole === "Lab Admin" ? {} : { onlyOwned: true }),
            status,
            category_id: categoryId,
            ...pageParams(page),
          }),
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
          const { rows, hasNext } = splitPage(ticketBody.Tickets);
          setTickets(
            rows.map((t) => mapBackendTicket(t, categoryById, accountById)),
          );
          setTicketsHasNext(hasNext);
          setTicketsError(null);
        }
      } catch (err) {
        if (!cancelled)
          setTicketsError(
            err instanceof Error ? err.message : "Failed to load tickets",
          );
      } finally {
        if (!cancelled) {
          setTicketsLoading(false);
          setTicketsLoadedPage(page);
        }
      }
    }

    loadTickets();
    return () => {
      cancelled = true;
    };
  }, [
    userRole,
    meLoading,
    enabled,
    page,
    status,
    categoryId,
    ticketsReloadKey,
  ]);

  return {
    tickets,
    ticketsHasNext,
    // loading also true on the render right after page change
    ticketsLoading: ticketsLoading || ticketsLoadedPage !== page,
    ticketsError,
    setTicketsReloadKey,
  };
}
