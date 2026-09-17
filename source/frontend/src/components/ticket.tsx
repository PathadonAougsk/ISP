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

export async function fetchTickets(onlyOwned = false): Promise<TicketsResponse> {
  const res = await apiFetch(`/ticket${onlyOwned ? "?onlyOwned=true" : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    fetchTickets()
      .then((body) => {
        setTickets(body.Tickets);
        console.log(body.Tickets)
      })
  }, []);

  return (
    <div></div>
  );
}
