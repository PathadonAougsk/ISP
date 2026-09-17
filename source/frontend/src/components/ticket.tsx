"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

export type TicketStatus = "pending" | "accepted" | "rejected" | (string & {});

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

export async function getTickets(params: GetTicketsParams = {}): Promise<TicketsResponse> {
  const { ticket_id, status, category_id, due_before, onlyOwned, limit } = params;
  const query = new URLSearchParams();

  if (ticket_id !== undefined) query.set("ticket_id", String(ticket_id));
  if (status !== undefined) query.set("status", status);
  if (category_id !== undefined) query.set("category_id", String(category_id));
  if (due_before !== undefined) query.set("due_before", due_before);
  if (onlyOwned !== undefined) query.set("onlyOwned", String(onlyOwned));
  if (limit !== undefined) query.set("limit", String(limit));

  const qs = query.toString();
  const res = await apiFetch(`/ticket${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    getTickets()
      .then((body) => {
        setTickets(body.Tickets);
        console.log(body.Tickets)
      })
  }, []);

  return (
    <div></div>
  );
}
