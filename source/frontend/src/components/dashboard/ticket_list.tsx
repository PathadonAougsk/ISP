"use client";

import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import { formatDueDate } from "@/lib/format";
import Icon from "@/components/icon";
import { isMissingTicket } from "@/components/dashboard/due_bucket";
import {
  ListHeader,
  ListMessage,
  listGridClass,
} from "@/components/dashboard/list_parts";
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
      <ListHeader titles={["Ticket Name", "Status", "Category", "Duedate"]} />

      {loadingTickets ? (
        <ListMessage>Loading tickets...</ListMessage>
      ) : errorTickets ? (
        <ListMessage>Failed to load tickets</ListMessage>
      ) : tickets.length === 0 ? (
        <ListMessage>
          {"Looks like everything's pretty peaceful around here. Hell yeah!"}
        </ListMessage>
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
              <div className={listGridClass}>
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
