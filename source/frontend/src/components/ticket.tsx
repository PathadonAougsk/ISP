"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import Image from "next/image";

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

function formatDueDate(iso: string) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(d.getUTCFullYear()).slice(-2);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${weekday} ${day} ${month} ${year}, ${time}`;
}

type TicketsResponse = { Tickets: Ticket[] };

export default function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const categoryMap: Record<number, string> = { 1: "Report", 2: "Project" };
  const ticketStatusIcon: Record<string, string> = {
    pending: "/pending.svg", "in_progress": "/in_progress.svg", accepted: "/approved.svg", rejected: "/rejected.svg", complete: "/header_donut_gray.svg",
  };

  useEffect(() => {
    apiFetch("/ticket")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body: TicketsResponse = await res.json();
        setTickets(body.Tickets);
        console.log(body.Tickets)
      })
  }, []);

  return (
    <div className="flex min-h-25 flex-1 flex-col gap-2">
      <div className="flex h-8 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image src="/header_arrow_down.svg" width={0} height={0} sizes="auto" className="h-4 w-auto" alt="" draggable={false} />
        <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Ticket Name</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Status</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {tickets.length === 0 ? (
        <p className="py-4 text-center text-base font-medium text-gray-500">"Looks like everything's pretty peaceful around here. Hell yeah!"</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((ticket) => {
            const status = ticket.status;
            const isComplete = status === "Complete";

            return (
              <div key={ticket.id} className={`flex h-8 items-center gap-4 rounded-[20px] px-2 ${isComplete ? "bg-gray-100" : "bg-white"}`}>
                <Image src={ticketStatusIcon[status]} width={0} height={0} sizes="auto" className="h-4 w-auto shrink-0" alt={status} draggable={false} />
                <div className="grid flex-1 grid-cols-[2fr_1fr_1.4fr_1.2fr] items-center gap-2">
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{ticket.name}</p>
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{categoryMap[ticket.category_id]}</p>
                  <p className={`truncate text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{status}</p>
                  <p className={`text-sm ${isComplete ? "text-gray-400" : "text-black"}`}>{formatDueDate(ticket.due_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
