"use client";

import type { TicketRow } from "@/lib/ticket";
import type { Category } from "@/lib/category";
import Icon from "@/components/ui/icon";
import { ticketStatusIcon } from "@/components/dashboard/dashboard-data";
import {
  formatDueDate,
  RequestTableFrame,
  type TableFilters,
} from "@/components/request-table/RequestList";
import { isPastDate } from "@/lib/format";

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

export default function TicketTable({
  tickets,
  loading,
  error,
  categories,
  filters,
  onFilterChange,
  onPageChange,
  hasNext,
  totalPages,
  onSelect,
  onCreate,
  canCreate,
}: {
  tickets: TicketRow[];
  loading: boolean;
  error: string | null;
  categories: Category[];
  filters: TableFilters;
  onFilterChange: (patch: Partial<Omit<TableFilters, "page">>) => void;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  totalPages: number;
  onSelect: (ticket: TicketRow) => void;
  onCreate: () => void;
  canCreate: boolean;
}) {
  return (
    <RequestTableFrame
      title="Tickets"
      noun="tickets"
      rows={tickets}
      loading={loading}
      error={error}
      canCreate={canCreate}
      onCreate={onCreate}
      categories={categories}
      statusOptions={statusOptions}
      filters={filters}
      onFilterChange={onFilterChange}
      onPageChange={onPageChange}
      hasNext={hasNext}
      totalPages={totalPages}
      titles={titles}
      gridClassName={gridClassName}
      onSelect={onSelect}
      getRow={(ticket) => {
        // only pending ticket can be overdue
        const overdue =
          ticket.status === "Pending" && isPastDate(ticket.dueDateValue);

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
              className="h-4 w-auto shrink-0"
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
