"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

type TicketStatus = "pending" | "accepted" | "rejected" | (string & {});

type Ticket = {
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

type TicketsResponse = { Tickets: Ticket[] };

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    apiFetch("/ticket/")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body: TicketsResponse = await res.json();
        setTickets(body.Tickets);
        console.log(body.Tickets)
      })
  }, []);

  return (
    <div></div>
  );
}
