"use client";

import { useEffect, useState } from "react";
import { getAccounts, type UserRole } from "@/lib/account";
import { getCategories } from "@/lib/category";
import { getTickets, mapBackendTicket, type TicketRow } from "@/lib/ticket";

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
