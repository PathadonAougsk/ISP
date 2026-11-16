"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/ui/icon";

// Header and rows share one grid, so the columns line up. `gridClassName` is
// the full grid-cols string from the caller, e.g. "grid-cols-[1fr_2fr]", so
// tailwind can see it.
const grid = (gridClassName: string) =>
  `grid flex-1 items-center gap-3 ${gridClassName}`;

// green bar, one title per column. keeps room on the right for the scrollbar
export function TableHeader({
  titles,
  gridClassName,
  hasOverflow = false,
  onIconClick,
  iconLabel = "Toggle table section",
  sortKeys,
  sortKey,
  sortDirection,
  onSort,
}: {
  titles: string[];
  gridClassName: string;
  hasOverflow?: boolean;
  onIconClick?: () => void;
  iconLabel?: string;
  sortKeys?: string[];
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
}) {
  return (
    <div
      className={`flex h-8 shrink-0 items-center gap-5 rounded-[20px] bg-(--primary-color-2) pl-2 ${
        hasOverflow ? "pr-6" : "pr-4"
      }`}
    >
      {onIconClick ? (
        <button
          type="button"
          onClick={onIconClick}
          aria-label={iconLabel}
          className="flex size-4 shrink-0 items-center justify-center"
        >
          <Icon src="/header_donut_dark_green.svg" className="size-4" />
        </button>
      ) : (
        <Icon src="/header_donut_dark_green.svg" className="size-4" />
      )}
      <div className={grid(gridClassName)}>
        {titles.map((title, index) => {
          const key = sortKeys?.[index];
          const isSorted = key !== undefined && key === sortKey;

          return onSort && key ? (
            <button
              key={title}
              type="button"
              onClick={() => onSort(key)}
              aria-label={`Sort by ${title}`}
              aria-sort={isSorted ? sortDirection : "none"}
              className="min-w-0 truncate text-left text-base font-bold text-white"
            >
              {title}
              {isSorted && (sortDirection === "asc" ? " ↑" : " ↓")}
            </button>
          ) : (
            <h1
              key={title}
              className="truncate text-base font-bold text-white"
            >
              {title}
            </h1>
          );
        })}
      </div>
    </div>
  );
}

// One clickable row. lead = the mark before the cells, cells = the column text.
// fullLastCell leaves the last column untruncated, for a date that has to show
// in full.
export function TableRow({
  cells,
  lead,
  overdue,
  spacingClassName,
  gridClassName,
  fullLastCell = false,
  onClick,
}: {
  cells: string[];
  lead: ReactNode;
  overdue: boolean;
  spacingClassName: string;
  gridClassName: string;
  fullLastCell?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full shrink-0 items-center rounded-[20px] border-2 bg-white text-left hover:bg-gray-100 ${spacingClassName} ${
        overdue
          ? "border-(--primary-red) text-red-700"
          : "border-transparent text-black"
      }`}
    >
      {lead}
      <div className={grid(gridClassName)}>
        {cells.map((cell, index) => (
          // title shows the full text when the cell is cut
          <p
            key={index}
            title={cell}
            className={`text-sm ${
              fullLastCell && index === cells.length - 1 ? "" : "truncate"
            }`}
          >
            {cell}
          </p>
        ))}
      </div>
    </button>
  );
}

// loading, error or empty text for a list
export function ListMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-base font-medium text-gray-400">
      {children}
    </p>
  );
}

// separator line + button. disabled while the list is refetching
export function LoadMoreButton({
  label = "Load more",
  disabled,
  onClick,
}: {
  label?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative flex h-8 w-full shrink-0 items-center justify-center">
      <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-gray-300" />
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`relative z-10 rounded-full border border-gray-300 px-4 py-1 text-sm font-medium text-gray-500 ${
          disabled ? "bg-gray-100" : "bg-white hover:bg-gray-100"
        }`}
      >
        {label}
      </button>
    </div>
  );
}

// true while the list is tall enough to show a scrollbar, so the header can
// keep room for it
export function useListOverflow() {
  const [hasOverflow, setHasOverflow] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // no deps, run every render. list size can change any time
  useEffect(() => {
    const element = listRef.current;
    if (!element) return;

    const checkOverflow = () => {
      const hasVerticalOverflow = element.scrollHeight > element.clientHeight;

      const scrollbarWidth =
        element.offsetWidth - element.clientWidth - element.clientLeft * 2;

      setHasOverflow(hasVerticalOverflow && scrollbarWidth > 0);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => observer.disconnect();
  });

  return { listRef, hasOverflow };
}
