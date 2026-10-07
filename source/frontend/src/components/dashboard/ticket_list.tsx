"use client";

import type { CategoryMap } from "@/lib/category";
import type { Ticket } from "@/lib/ticket";
import { formatShortDate } from "@/lib/format";
import Icon from "@/components/icon";
import { isMissingTicket } from "@/components/dashboard/due_bucket";
import {
  ListHeader,
  ListMessage,
  listGridClass,
  useListOverflow,
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
  const { listRef, hasOverflow } = useListOverflow([tickets]);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <ListHeader
        titles={["Ticket Name", "Status", "Category", "Duedate"]}
        hasOverflow={hasOverflow}
      />

      {loadingTickets ? (
        <ListMessage>Loading tickets...</ListMessage>
      ) : errorTickets ? (
        <ListMessage>Failed to load tickets</ListMessage>
      ) : tickets.length === 0 ? (
        <ListMessage>
          {"Looks like everything's pretty peaceful around here. Hell yeah!"}
        </ListMessage>
      ) : (
        <div
          ref={listRef}
          className="flex min-h-0 flex-col gap-2 overflow-y-auto scrollbar-thin"
        >
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onSelectTicket(ticket)}
              className="flex h-8 pl-2 pr-4 w-full shrink-0 cursor-pointer items-center gap-5 rounded-[20px] bg-white text-left hover:bg-gray-100"
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
                  {formatShortDate(ticket.due_date)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
