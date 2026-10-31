"use client";
import { useState } from "react";
import type { TicketRow, TicketStatus } from "@/lib/ticket";
import type { Category } from "@/lib/category";
import Icon from "@/components/icon";
import { ticketStatusIcon } from "@/components/dashboard/dashboard_status";
import { ListMessage } from "@/components/dashboard/dashboard_utils";
import Pagination from "@/components/request-table/Pagination";
import {
  isPastDate,
  RequestListHeader,
  RequestListRow,
} from "@/components/request-table/RequestList";
import { formatShortDate, truncateLabel } from "@/lib/format";

const titles = [
  "Ticket-ID",
  "Title",
  "Status",
  "Category",
  "Created By",
  "Due Date",
  "Created Date",
  "Last Update",
];

// full class string, tailwind need to see it
const gridClassName = "grid-cols-[0.6fr_2fr_1fr_1.2fr_1.2fr_1fr_1fr_1fr]";

const controlClass =
  "h-9 rounded-full bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color-2)";

export default function TicketTable({
  tickets,
  loading,
  error,
  categories,
  status,
  onStatusChange,
  categoryId,
  onCategoryChange,
  page,
  hasNext,
  onPageChange,
  onSelect,
  onCreate,
  canCreate,
}: {
  tickets: TicketRow[];
  loading: boolean;
  error: string | null;
  categories: Category[];
  status: TicketStatus | "All";
  onStatusChange: (status: TicketStatus | "All") => void;
  categoryId: number | "All";
  onCategoryChange: (id: number | "All") => void;
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  onSelect: (ticket: TicketRow) => void;
  onCreate: () => void;
  canCreate: boolean;
}) {
  // Search only looks at the rows on the current page
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="rounded-[30px] bg-(--panel-bg) p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="h-9 text-lg font-semibold flex items-center gap-2">
          Tickets
          {canCreate && (
            <button
              onClick={onCreate}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-(--primary-color-2) text-white text-2xl hover:bg-(--primary-color-2-hover)"
            >
              +
            </button>
          )}
        </h1>

        <div className="h-9 flex items-center gap-2">
          <input
            type="text"
            placeholder="Search this page"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={controlClass}
          />

          <select
            value={categoryId}
            onChange={(e) =>
              onCategoryChange(
                e.target.value === "All" ? "All" : Number(e.target.value),
              )
            }
            className={`${controlClass} max-w-40 truncate`}
          >
            <option value="All">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} title={c.name}>
                {truncateLabel(c.name)}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) =>
              onStatusChange(e.target.value as TicketStatus | "All")
            }
            className={`${controlClass} max-w-40 truncate`}
          >
            <option value="All">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <RequestListHeader titles={titles} gridClassName={gridClassName} />

        {filteredTickets.map((ticket) => {
          // only pending ticket can be overdue
          const overdue =
            ticket.status === "Pending" && isPastDate(ticket.dueDateValue);

          return (
            <RequestListRow
              key={ticket.id}
              overdue={overdue}
              spacingClassName="pl-1.5 pr-3.5 gap-5"
              gridClassName={gridClassName}
              lead={
                <Icon
                  src={
                    overdue
                      ? "/alert.svg"
                      : ticketStatusIcon[ticket.status.toLowerCase()]
                  }
                  className="h-4 w-auto shrink-0"
                  alt={ticket.status}
                />
              }
              cells={[
                ticket.id,
                ticket.title,
                ticket.status,
                ticket.category,
                ticket.createdBy,
                ticket.dueDateValue
                  ? formatShortDate(ticket.dueDateValue)
                  : ticket.dueDate || "—",
                ticket.createdDate,
                ticket.lastUpdate,
              ]}
              onClick={() => onSelect(ticket)}
            />
          );
        })}

        {loading && tickets.length === 0 && (
          <ListMessage>Loading tickets…</ListMessage>
        )}
        {error && !loading && (
          <ListMessage>Couldn't load tickets: {error}</ListMessage>
        )}
        {!loading && !error && filteredTickets.length === 0 && (
          <ListMessage>No tickets match your search.</ListMessage>
        )}
      </div>

      <Pagination
        page={page}
        hasNext={hasNext}
        loading={loading}
        onChange={onPageChange}
      />
    </div>
  );
}
