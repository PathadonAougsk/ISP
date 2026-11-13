"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { categoryOptions, type Category } from "@/lib/category";
import { formatShortDate } from "@/lib/format";
import Button from "@/components/ui/button";
import { Select, TextInput } from "@/components/ui/field";
import Icon from "@/components/ui/icon";
import Pagination from "@/components/ui/pagination";
import {
  ListMessage,
  TableHeader,
  TableRow,
  useListOverflow,
} from "@/components/ui/table";

// What page of which filtered list a tab is showing. "All" = no filter.
export type TableFilters = {
  page: number;
  status: string;
  categoryId: number | "All";
  search: string;
};

const FIRST_PAGE: TableFilters = {
  page: 1,
  status: "All",
  categoryId: "All",
  search: "",
};

// Paging and filters of one tab, kept alive while the other tab is on screen.
// Changing a filter goes back to page one, because the old page may not exist
// in the new result.
export function useTableFilters() {
  const [filters, setFilters] = useState(FIRST_PAGE);

  const setFilter = useCallback(
    (patch: Partial<Omit<TableFilters, "page">>) =>
      setFilters((prev) => ({ ...prev, ...patch, page: 1 })),
    [],
  );

  const setPage = useCallback(
    (page: number) => setFilters((prev) => ({ ...prev, page })),
    [],
  );

  return { filters, setFilter, setPage };
}

// what the list hooks want: anything left on "All" is simply not asked for
export function toQuery(filters: TableFilters) {
  return {
    status: filters.status === "All" ? undefined : filters.status,
    categoryId: filters.categoryId === "All" ? undefined : filters.categoryId,
    search: filters.search || undefined,
  };
}

// due date text for table cell and read only box
export function formatDueDate(row: { dueDateValue: string; dueDate: string }) {
  return row.dueDateValue
    ? formatShortDate(row.dueDateValue)
    : row.dueDate || "-";
}

// Whole table panel: title, create button, filters, header, rows, pagination.
// getRow turns one row into its cells plus the mark before them (icon or dot).
export function RequestTableFrame<T extends { id: string; title: string }>({
  title,
  noun,
  rows,
  loading,
  error,
  canCreate,
  onCreate,
  categories,
  statusOptions,
  filters,
  onFilterChange,
  onPageChange,
  hasNext,
  totalPages,
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
  statusOptions: { value: string; label: string }[];
  filters: TableFilters;
  onFilterChange: (patch: Partial<Omit<TableFilters, "page">>) => void;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  totalPages: number;
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
  // Draft only, search run on Enter. Start from saved search
  const [draft, setDraft] = useState(filters.search);
  const searchRef = useRef<HTMLInputElement>(null);

  // header need more right space when scrollbar show
  const { listRef, hasOverflow } = useListOverflow([rows.length, loading]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-t-[30px] bg-(--panel-bg) px-3 pt-3">
      <div className="mb-3 flex items-center justify-between">
        {/* type and create button */}
        <h1 className="flex h-9 items-center gap-3 pl-4 text-lg font-semibold">
          {title}
          {canCreate && (
            <Button
              variant="green"
              size="circle"
              onClick={onCreate}
              aria-label={`Create new ${noun}`}
            >
              +
            </Button>
          )}
        </h1>

        <div className="flex h-9 items-center gap-2">
          {/* searchbox */}
          <div className="relative w-100">
            <TextInput
              ref={searchRef}
              look="panel"
              placeholder="Search"
              value={draft}
              onChange={setDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onFilterChange({ search: draft.trim() });
                }
              }}
              className="w-full pr-10"
            />
            {draft && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  searchRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
              >
                <Icon src="/close.svg" className="h-3 w-3" />
              </button>
            )}
          </div>

          <Select
            look="panel"
            className="w-50"
            value={filters.categoryId}
            placeholder={{ value: "All", label: "All categories" }}
            firstItem={{ value: "All", label: "All categories" }}
            options={categoryOptions(categories, true)}
            onChange={(value) =>
              onFilterChange({
                categoryId: value === "All" ? "All" : Number(value),
              })
            }
          />

          <Select
            look="panel"
            className="w-50"
            value={filters.status}
            placeholder={{ value: "All", label: "All statuses" }}
            firstItem={{ value: "All", label: "All statuses" }}
            options={statusOptions}
            onChange={(status) => onFilterChange({ status })}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <TableHeader
          titles={titles}
          gridClassName={gridClassName}
          hasOverflow={hasOverflow}
        />

        {/* row list */}
        <div
          ref={listRef}
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin"
        >
          {/* rows hide while loading, so old page dont show */}
          {!loading &&
            !error &&
            rows.map((row) => (
              <TableRow
                key={row.id}
                gridClassName={gridClassName}
                onClick={() => onSelect(row)}
                {...getRow(row)}
              />
            ))}

          {/* message when loading or error */}
          {loading && <ListMessage>Loading {noun}…</ListMessage>}
          {error && !loading && (
            <ListMessage>
              Couldn&apos;t load {noun}: {error}
            </ListMessage>
          )}
          {!loading && !error && rows.length === 0 && (
            <ListMessage>No {noun} match your search.</ListMessage>
          )}

          {/* floating page selection */}
          <div className="pointer-events-none sticky bottom-0 mt-auto flex justify-center pb-2">
            <Pagination
              page={filters.page}
              totalPages={totalPages}
              hasNext={hasNext}
              loading={loading}
              onChange={onPageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
