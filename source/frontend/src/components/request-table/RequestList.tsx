"use client";

import { useState, type ReactNode } from "react";
import type { Category } from "@/lib/category";
import Icon from "@/components/icon";
import {
  ListMessage,
  useListOverflow,
} from "@/components/dashboard/dashboard-utils";
import { todayIso } from "@/components/request-table/DateInput";
import Pagination from "@/components/request-table/Pagination";
import { formatShortDate, truncateLabel } from "@/lib/format";

// true when date is before today (local time). empty = false
export function isPastDate(isoDate: string) {
  if (!isoDate) return false;

  // iso string compare is ok
  return isoDate < todayIso();
}

// due date text for table cell and read only box
export function formatDueDate(row: { dueDateValue: string; dueDate: string }) {
  return row.dueDateValue
    ? formatShortDate(row.dueDateValue)
    : row.dueDate || "-";
}

const controlClass =
  "h-9 px-4 rounded-full bg-white text-sm focus:outline-none focus:ring-1 focus:ring-(--primary-color-2)";

// one dropdown filter. both filters use same shape
type Filter = {
  key: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string; title?: string }[];
};

// whole table panel: title, create btn, filters, header, rows, pagination
// grid class come from caller, full string so tailwind can see it
// ex: "grid-cols-[1fr_2fr_1fr]"
// getRow turn one row into its cells + mark before cells (icon or dot)
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
  onSelect,
  getRow,
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
  onSelect: (row: T) => void;
  getRow: (row: T) => {
    cells: string[];
    lead: ReactNode;
    overdue: boolean;
    spacingClassName: string;
  };
}) {
  // Search only looks at the rows on the current page
  const [searchTerm, setSearchTerm] = useState("");

  const term = searchTerm.toLowerCase();
  const filteredRows = rows.filter(
    (row) =>
      row.title.toLowerCase().includes(term) ||
      row.id.toLowerCase().includes(term),
  );

  // header need more right space when scrollbar show
  const { listRef, hasOverflow } = useListOverflow([
    filteredRows.length,
    loading,
  ]);

  const filters: Filter[] = [
    {
      key: "category",
      value: categoryId,
      onChange: (v) => onCategoryChange(v === "All" ? "All" : Number(v)),
      options: categories.map((c) => ({
        value: c.id,
        label: truncateLabel(c.name),
        title: c.name,
      })),
    },
    {
      key: "status",
      value: status,
      onChange: onStatusChange,
      options: statusOptions,
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 p-3 rounded-t-[30px] bg-(--panel-bg)">
      <div className="flex items-center justify-between mb-3">
        {/* type and create button */}
        <h1 className="flex items-center gap-3 h-9 pl-4 text-lg font-semibold">
          {title}
          {canCreate && (
            <button
              onClick={onCreate}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-(--primary-color-2) text-2xl text-white hover:bg-(--primary-color-2-hover)"
            >
              +
            </button>
          )}
        </h1>

        <div className="flex items-center gap-2 h-9">
          {/* searchbox */}
          <input
            type="text"
            placeholder="Search this page"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${controlClass} w-100`}
          />

          {/* category filter and status filter*/}
          {filters.map((f) => (
            <div key={f.key} className="relative">
              <select
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className={`${controlClass} w-40 pr-8 truncate appearance-none cursor-pointer ${
                  f.value === "All" ? "text-gray-500" : "text-black"
                }`}
              >
                <option value="All">All</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value} title={o.title}>
                    {o.label}
                  </option>
                ))}
              </select>
              <img
                src="/dropdown_arrow.svg"
                alt=""
                className="absolute right-2 top-1/2 w-4 h-4 -translate-y-1/2 pointer-events-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 gap-2">
        {/* green header bar */}
        <div
          className={`flex items-center h-8 shrink-0 gap-5 pl-2 rounded-[20px] bg-(--primary-color-2) ${
            hasOverflow ? "pr-6" : "pr-4"
          }`}
        >
          <Icon src="/header_donut_dark_green.svg" />
          <div className={`grid flex-1 items-center gap-3 ${gridClassName}`}>
            {titles.map((t) => (
              <h1 key={t} className="truncate text-base font-bold text-white">
                {t}
              </h1>
            ))}
          </div>
        </div>

        {/* row list */}
        <div
          ref={listRef}
          className="flex flex-col flex-1 min-h-0 gap-2 overflow-y-auto scrollbar-thin"
        >
          {/* rows hide while loading, so old page dont show */}
          {!loading &&
            !error &&
            filteredRows.map((row) => {
              const { cells, lead, overdue, spacingClassName } = getRow(row);

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelect(row)}
                  className={`flex items-center w-full h-8 shrink-0 border-2 rounded-[20px] bg-white text-left cursor-pointer hover:bg-gray-100 ${spacingClassName} ${
                    overdue
                      ? "border-(--primary-red) text-red-700"
                      : "border-transparent text-black"
                  }`}
                >
                  {lead}
                  <div
                    className={`grid flex-1 items-center gap-3 ${gridClassName}`}
                  >
                    {cells.map((cell, index) => (
                      // title show full text when cell is cut
                      <p key={index} className="truncate text-sm" title={cell}>
                        {cell}
                      </p>
                    ))}
                  </div>
                </button>
              );
            })}

          {/* message when loading or error */}
          {loading && <ListMessage>Loading {noun}…</ListMessage>}
          {error && !loading && (
            <ListMessage>
              Couldn't load {noun}: {error}
            </ListMessage>
          )}
          {!loading && !error && filteredRows.length === 0 && (
            <ListMessage>No {noun} match your search.</ListMessage>
          )}
        </div>
      </div>

      {/* footer for page selection */}
      <Pagination
        page={page}
        hasNext={hasNext}
        loading={loading}
        onChange={onPageChange}
      />
    </div>
  );
}
