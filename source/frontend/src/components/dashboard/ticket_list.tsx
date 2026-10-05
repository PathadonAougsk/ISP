"use client";

import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import { formatDueDate } from "@/lib/format";
import Icon from "@/components/icon";
import { isMissingTicket } from "@/components/dashboard/due_bucket";
import {
  ticketStatusIcon,
  ticketStatusText,
} from "@/components/dashboard/ticket_status";

export default function TicketList({
  tickets,
  loadingTickets,
  errorTickets,
  categoryMap,
  onSelectTicket,
}: {
  tickets: Ticket[];
  loadingTickets: boolean;
  errorTickets: boolean;
  categoryMap: CategoryMap;
  onSelectTicket: (ticket: Ticket) => void;
}) {
  const now = new Date();

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex h-8 shrink-0 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Icon src="/header_donut_dark_green.svg" />
        <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">
            Ticket Name
          </h1>
          <h1 className="truncate text-base font-bold text-white">Status</h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {loadingTickets ? (
        <p className="py-6 text-center text-base font-medium text-gray-500">
          Loading tickets...
        </p>
      ) : errorTickets ? (
        <p className="py-6 text-center text-base font-medium text-gray-500">
          Failed to load tickets
        </p>
      ) : tickets.length === 0 ? (
        <p className="py-6 text-center text-base font-medium text-gray-500">
          {"Looks like everything's pretty peaceful around here. Hell yeah!"}
        </p>
      ) : (
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onSelectTicket(ticket)}
              className="flex h-8 w-full shrink-0 cursor-pointer items-center gap-4 rounded-[20px] bg-white px-2 text-left hover:bg-gray-100"
            >
              <Icon
                src={
                  isMissingTicket(ticket, now)
                    ? "/alert.svg"
                    : ticketStatusIcon[ticket.status]
                }
                className="h-4 w-auto shrink-0"
                alt={ticket.status}
              />
              <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
                <p className="truncate text-sm text-black">{ticket.name}</p>
                <p className="truncate text-sm text-black">
                  {ticketStatusText[ticket.status]}
                </p>
                <p className="truncate text-sm text-black">
                  {categoryMap[ticket.category_id] ?? "-"}
                </p>
                <p className="text-sm text-black">
                  {formatDueDate(ticket.due_date)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
