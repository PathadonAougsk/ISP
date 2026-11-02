"use client";

import { useState, type ReactNode } from "react";
import type { Category } from "@/lib/category";
import Icon from "@/components/icon";
import { ListMessage } from "@/components/dashboard/dashboard_utils";
import Pagination from "@/components/request-table/Pagination";
import { formatShortDate, truncateLabel } from "@/lib/format";

// grid class come from caller, full string so tailwind can see it
// ex: "grid-cols-[1fr_2fr_1fr]"
const gridBase = "grid flex-1 items-center gap-3";

// green header bar, same look as dashboard. one title per column
export function RequestListHeader({
  titles,
  gridClassName,
  hasOverflow = false,
}: {
  titles: string[];
  gridClassName: string;
  hasOverflow?: boolean;
}) {
  return (
    <div
      className={`flex h-8 shrink-0 items-center gap-5 rounded-[20px] bg-(--primary-color-2) pl-2 ${
        hasOverflow ? "pr-6" : "pr-4"
      }`}
    >
      <Icon src="/header_donut_dark_green.svg" />
      <div className={`${gridBase} ${gridClassName}`}>
        {titles.map((title) => (
          <h1 key={title} className="truncate text-base font-bold text-white">
            {title}
          </h1>
        ))}
      </div>
    </div>
  );
}

// one clickable white row. lead = mark before cells (icon or dot)
export function RequestListRow({
  gridClassName,
  cells,
  lead,
  overdue = false,
  spacingClassName = "pl-2.5 pr-3.5 gap-5",
  onClick,
}: {
  gridClassName: string;
  cells: string[];
  lead?: ReactNode;
  overdue?: boolean;
  spacingClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full shrink-0 cursor-pointer items-center rounded-[20px] border-2 bg-white text-left hover:bg-gray-100 ${spacingClassName} ${
        overdue
          ? "border-(--primary-red) text-red-700"
          : "border-transparent text-black"
      }`}
    >
      {lead}
      <div className={`${gridBase} ${gridClassName}`}>
        {cells.map((cell, index) => (
          // title show full text when cell is cut
          <p key={index} className="truncate text-sm" title={cell}>
            {cell}
          </p>
        ))}
      </div>
    </button>
  );
}

// true when date is before today (local time). empty = false
export function isPastDate(isoDate: string) {
  if (!isoDate) return false;

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  // iso string compare is ok
  return isoDate < `${now.getFullYear()}-${mm}-${dd}`;
}

// due date text for table cell and read only box
export function formatDueDate(row: { dueDateValue: string; dueDate: string }) {
  return row.dueDateValue
    ? formatShortDate(row.dueDateValue)
    : row.dueDate || "—";
}

const controlClass =
  "h-9 rounded-full bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-(--primary-color-2)";

// whole table panel: title, create btn, filters, header, rows, pagination
// children get the rows left after search
export function RequestTableFrame<T extends { id: string; title: string }>({
  title,
  noun,
  rows,
  loading,
  error,
  canCreate,
  onCreate,
  categories,
  categoryId,
  onCategoryChange,
  status,
  onStatusChange,
  statusOptions,
  page,
  hasNext,
  onPageChange,
  titles,
  gridClassName,
  children,
}: {
  title: string;
  noun: string;
  rows: T[];
  loading: boolean;
  error: string | null;
  canCreate: boolean;
  onCreate: () => void;
  categories: Category[];
  categoryId: number | "All";
  onCategoryChange: (id: number | "All") => void;
  status: string;
  onStatusChange: (status: string) => void;
  statusOptions: { value: string; label: string }[];
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  titles: string[];
  gridClassName: string;
  children: (rows: T[]) => ReactNode;
}) {
  // Search only looks at the rows on the current page
  const [searchTerm, setSearchTerm] = useState("");

  const term = searchTerm.toLowerCase();
  const filteredRows = rows.filter(
    (row) =>
      row.title.toLowerCase().includes(term) ||
      row.id.toLowerCase().includes(term),
  );

  return (
    <div className="rounded-[30px] bg-(--panel-bg) p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="h-9 text-lg font-semibold flex items-center gap-2">
          {title}
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
            className={`${controlClass} w-100`}
          />

          <select
            value={categoryId}
            onChange={(e) =>
              onCategoryChange(
                e.target.value === "All" ? "All" : Number(e.target.value),
              )
            }
            className={`${controlClass} w-40 truncate`}
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
            onChange={(e) => onStatusChange(e.target.value)}
            className={`${controlClass} w-40 truncate`}
          >
            <option value="All">All</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <RequestListHeader titles={titles} gridClassName={gridClassName} />

        {children(filteredRows)}

        {loading && rows.length === 0 && (
          <ListMessage>Loading {noun}…</ListMessage>
        )}
        {error && !loading && (
          <ListMessage>
            Couldn't load {noun}: {error}
          </ListMessage>
        )}
        {!loading && !error && filteredRows.length === 0 && (
          <ListMessage>No {noun} match your search.</ListMessage>
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
