"use client";
import type { TicketRow, TicketStatus } from "@/lib/ticket";
import type { Category } from "@/lib/category";
import Icon from "@/components/icon";
import { ticketStatusIcon } from "@/components/dashboard/dashboard-data";
import {
  formatDueDate,
  isPastDate,
  RequestListRow,
  RequestTableFrame,
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
const gridClassName = "grid-cols-[0.2fr_2fr_1.2fr_1fr_1.2fr_1fr_1fr_1fr]";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

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
      categoryId={categoryId}
      onCategoryChange={onCategoryChange}
      status={status}
      onStatusChange={(s) => onStatusChange(s as TicketStatus | "All")}
      statusOptions={statusOptions}
      page={page}
      hasNext={hasNext}
      onPageChange={onPageChange}
      titles={titles}
      gridClassName={gridClassName}
    >
      {(rows) =>
        rows.map((ticket) => {
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
                ticket.category,
                ticket.status,
                ticket.createdBy,
                formatDueDate(ticket),
                ticket.createdDate,
                ticket.lastUpdate,
              ]}
              onClick={() => onSelect(ticket)}
            />
          );
        })
      }
    </RequestTableFrame>
  );
}
