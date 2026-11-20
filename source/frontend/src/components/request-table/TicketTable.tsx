"use client";

import type { TicketRow } from "@/lib/ticket";
import Icon from "@/components/ui/icon";
import {
  isMissingItem,
  ticketStatusIcon,
} from "@/components/dashboard/dashboard-data";
import {
  formatDueDate,
  RequestTableFrame,
  type TableProps,
} from "@/components/request-table/RequestList";

const titles = [
  "ID",
  "Title",
  "Category",
  "Status",
  "Created By",
  "Due Date",
  "Created Date",
  "Last Update",
];

// full class string, tailwind need to see it
const gridClassName = "grid-cols-[0.2fr_1.4fr_1.2fr_0.8fr_0.8fr_0.8fr_1fr_1fr]";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "accepted", label: "Accepted" },
];

export default function TicketTable(props: TableProps<TicketRow>) {
  const now = new Date();

  return (
    <RequestTableFrame
      {...props}
      title="Tickets"
      noun="tickets"
      statusOptions={statusOptions}
      titles={titles}
      gridClassName={gridClassName}
      getRow={(ticket) => {
        // same rule as dashboard: pending/rejected + deadline passed
        const overdue = isMissingItem(
          { status: ticket.status, due_date: ticket.dueDateIso },
          ["Pending", "Rejected"],
          now,
        );

        return {
          overdue,
          spacingClassName: "pl-1.5 pr-3.5 gap-5",
          lead: (
            <Icon
              src={
                overdue
                  ? "/alert.svg"
                  : ticketStatusIcon[ticket.status.toLowerCase()]
              }
              className="size-4 shrink-0"
              alt={ticket.status}
            />
          ),
          cells: [
            ticket.id,
            ticket.title,
            ticket.category,
            ticket.status,
            ticket.createdBy,
            formatDueDate(ticket),
            ticket.createdDate,
            ticket.lastUpdate,
          ],
        };
      }}
    />
  );
}
