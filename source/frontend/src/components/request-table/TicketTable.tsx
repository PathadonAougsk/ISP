"use client";

import type { TicketRow } from "@/lib/ticket";
import type { Category } from "@/lib/category";
import Icon from "@/components/ui/icon";
import {
  isMissingItem,
  ticketStatusIcon,
} from "@/components/dashboard/dashboard-data";
import {
  formatDueDate,
  RequestTableFrame,
  type TableFilters,
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
  totalResults,
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
  totalResults: number;
  onSelect: (ticket: TicketRow) => void;
  onCreate: () => void;
  canCreate: boolean;
}) {
  const now = new Date();

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
      totalResults={totalResults}
      titles={titles}
      gridClassName={gridClassName}
      onSelect={onSelect}
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
