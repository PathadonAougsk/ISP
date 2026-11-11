"use client";

import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import type { UserRole } from "@/lib/account";
import { formatShortDateTime, toDateInputValue } from "@/lib/format";
import { cached, withoutPagination } from "@/lib/cache/cache";
import { loadLookups, type Lookups } from "@/lib/lookup";
import { usePagedList } from "@/lib/paged-list";
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

export type TicketsResponse = { Tickets: Ticket[]; TicketCount?: number };

export type GetTicketsParams = {
  ticket_id?: number;
  search?: string;
  status?: TicketStatus;
  category_id?: number;
  due_after?: string;
  /** ISO 8601 string, e.g. new Date().toISOString() - FastAPI parses it into a datetime. */
  due_before?: string;
  onlyOwned?: boolean;
  notOwned?: boolean;
  get_count?: boolean;
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
  dueDateIso: string | null; // as stored, to send back when the field is untouched
  createdDate: string;
  lastUpdate: string;
  category: string;
  description: string;
  createdBy: string;
  assignedTo: string;
  categoryId: number;
  createdById: string;
};

// A Lab User only ever sees their own tickets, so the backend gets told so.
function scope(userRole: UserRole) {
  return userRole === "Lab Admin" ? {} : { onlyOwned: true };
}

async function fetchTickets(
  params: GetTicketsParams = {},
): Promise<TicketsResponse> {
  const qs = buildQuery(params).toString();
  const res = await apiFetch(`/ticket/${qs ? `?${qs}` : ""}`);
  await apiOrThrow(res, `HTTP ${res.status}`);

  return res.json();
}

const TICKETS_CACHE_TTL = 5 * 60 * 1000;

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
  await apiOrThrow(res, "Could not create that ticket.");

  // data changed, so drop cached lists
  getTickets.clear();

  return res.json();
}

export async function putTicket(
  id: number | string,
  body: TicketUpdatePayload,
): Promise<Ticket> {
  const res = await apiOrThrow(
    await apiSendJson(`/ticket/${id}`, "PUT", body),
    "Could not update that ticket.",
  );

  // data changed, so drop cached lists
  getTickets.clear();

  return res.json();
}

function mapTicket(
  ticket: Ticket,
  { categoryById, accountById }: Lookups,
): TicketRow {
  const status = ticket.status;

  return {
    id: String(ticket.id),
    title: ticket.name,
    status:
      status === "accepted"
        ? "Accepted"
        : status === "rejected"
          ? "Rejected"
          : "Pending",
    dueDate: formatShortDateTime(ticket.due_date),
    dueDateValue: toDateInputValue(ticket.due_date),
    dueDateIso: ticket.due_date,
    createdDate: formatShortDateTime(ticket.created, "created"),
    lastUpdate: formatShortDateTime(ticket.updated, "updated"),
    category:
      categoryById.get(ticket.category_id) ?? `Category #${ticket.category_id}`,
    description: ticket.description ?? "",
    createdBy: accountById.get(ticket.created_by) ?? "-",
    assignedTo: ticket.assigned_id
      ? (accountById.get(ticket.assigned_id) ?? "-")
      : "",
    categoryId: ticket.category_id,
    createdById: ticket.created_by,
  };
}

// fetch one ticket by id for the modal. throw if not found
export async function getTicketRowById(
  id: number,
  userRole: UserRole,
): Promise<TicketRow> {
  const [body, lookups] = await Promise.all([
    getTickets({ ...scope(userRole), ticket_id: id }),
    loadLookups(),
  ]);

  const ticket = body.Tickets.find((t) => t.id === id);
  if (!ticket) throw new Error("Ticket not found");

  return mapTicket(ticket, lookups);
}

export type TicketFilters = {
  status?: TicketStatus;
  categoryId?: number;
  search?: string;
};

// one page of the ticket table. waits for the role, which decides the scope
export function useTickets(
  userRole: UserRole,
  meLoading: boolean,
  page: number,
  filters: TicketFilters,
  enabled: boolean,
) {
  const { status, categoryId, search } = filters;

  const list = usePagedList(
    page,
    enabled && !meLoading,
    [userRole, status, categoryId, search],
    async (paging) => {
      const body = await getTickets({
        ...scope(userRole),
        status,
        category_id: categoryId,
        search,
        get_count: true,
        ...paging,
      });

      return { items: body.Tickets, count: body.TicketCount ?? 0 };
    },
    mapTicket,
    "Failed to load tickets",
  );

  return {
    tickets: list.rows,
    ticketsHasNext: list.hasNext,
    ticketsTotalPages: list.totalPages,
    ticketsLoading: list.loading,
    ticketsError: list.error,
    reloadTickets: list.reload,
  };
}
