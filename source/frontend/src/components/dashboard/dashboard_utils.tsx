"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { formatFullDateTime } from "@/lib/format";
import Icon from "@/components/icon";
import {
  isMissingItem,
  type DashboardView,
} from "@/components/dashboard/dashboard_status";

// ==========================================================
// Links
// ==========================================================

const urlRegex =
  /(?<![\w.-])((?:https?:\/\/|www\.)[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?::\d+)?(?:\/(?:[^\s]*[^\s.,!?;:])?)?)/g;

// make plain text into text with clickable links
export function renderWithLinks(text: string): ReactNode {
  const parts = text.split(urlRegex);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part.startsWith("http") ? part : `https://${part}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-800 italic underline"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

// ==========================================================
// List parts
// ==========================================================

// same grid for header and row, so column line up
export const listGridClass =
  "grid flex-1 grid-cols-[2fr_1.25fr_1.25fr_minmax(120px,1fr)] items-center gap-3";

// loading, error or empty text for a list
export function ListMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-base font-medium text-gray-500">
      {children}
    </p>
  );
}

// separator line + button. disabled while the list is refetching
export function LoadMoreButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative flex h-8 w-full shrink-0 items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-300" />
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`relative z-10 rounded-full border border-gray-300 bg-white px-4 py-1 text-sm font-medium text-gray-600 ${
          disabled
            ? "cursor-wait opacity-60"
            : "cursor-pointer hover:bg-gray-100"
        }`}
      >
        Load More
      </button>
    </div>
  );
}

// label + rows of one section
// label = title + count (count already formatted into string and "+" sign)
// label sticky, so it stay under column header while its section scroll
// Load More show only when onLoadMore is given (list overflow)
export function ListSection({
  title,
  count,
  busy = false,
  onLoadMore,
  children,
}: {
  title: string;
  count: string;
  busy?: boolean;
  onLoadMore?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="sticky top-0 z-10 flex shrink-0 items-end gap-2 bg-(--panel-bg) pl-1 pb-2">
        <h1 className="text-base font-semibold text-black">{title}</h1>
        <span className="text-xl font-bold text-green-800">{count}</span>
      </div>
      {children}
      {onLoadMore && <LoadMoreButton disabled={busy} onClick={onLoadMore} />}
    </div>
  );
}

// one clickable row for task or ticket. lead = mark before cells, cells = column text
export function ListRow({
  overdue,
  spacingClassName,
  lead,
  cells,
  onClick,
}: {
  overdue: boolean;
  spacingClassName: string;
  lead: ReactNode;
  cells: string[];
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
      <div className={listGridClass}>
        {cells.map((cell, index) => (
          // last cell is date, no truncate
          <p
            key={index}
            className={
              index === cells.length - 1 ? "text-sm" : "truncate text-sm"
            }
          >
            {cell}
          </p>
        ))}
      </div>
    </button>
  );
}

// green header bar (one title per column) + scroll body. show message when list is empty
export function ListPanel({
  titles,
  hasOverflow,
  listRef,
  empty,
  message,
  children,
}: {
  titles: string[];
  hasOverflow: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  empty: boolean;
  message: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div
        className={`flex h-8 shrink-0 items-center gap-5 rounded-[20px] bg-(--primary-color-2) pl-2 ${
          hasOverflow ? "pr-6" : "pr-4"
        }`}
      >
        <Icon src="/header_donut_dark_green.svg" />
        <div className={listGridClass}>
          {titles.map((title) => (
            <h1 key={title} className="truncate text-base font-bold text-white">
              {title}
            </h1>
          ))}
        </div>
      </div>

      {empty ? (
        <ListMessage>{message}</ListMessage>
      ) : (
        <div
          ref={listRef}
          className="flex min-h-0 flex-col gap-2 overflow-y-auto scrollbar-thin"
        >
          {children}
        </div>
      )}
    </div>
  );
}

// overflown detection
export function useListOverflow(dependencies: unknown[]) {
  const [hasOverflow, setHasOverflow] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = listRef.current;

    if (!element) {
      return;
    }

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
  }, dependencies);

  return { listRef, hasOverflow };
}

// ==========================================================
// Slideup parts
// ==========================================================

// black button, go to request-table. label is different per caller
export function RequestTableButton({
  type,
  id,
  label,
}: {
  type: DashboardView;
  id: number;
  label: string;
}) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setRedirecting(true);
        router.push(`/request-table?type=${type}&id=${id}`);
      }}
      disabled={redirecting}
      className={`flex h-7.5 w-60 items-center justify-center rounded-full px-4 text-sm font-semibold text-white ${
        redirecting
          ? "cursor-wait bg-gray-700"
          : "cursor-pointer bg-black hover:bg-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

// id + category + created date row. children are extra items added at the end
export function SlideupMeta({
  id,
  categoryName,
  createdDate,
  children,
}: {
  id: number;
  categoryName: string;
  createdDate: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-600">
      <span className="font-bold">#{id}</span>
      <div className="flex items-center gap-2">
        <Icon src="/header_donut_gray.svg" />
        <span>{categoryName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon src="/clock.svg" />
        <span>{formatFullDateTime(createdDate)}</span>
      </div>
      {children}
    </div>
  );
}

// shows nothing when the item was never edited
export function SlideupEdited({
  created,
  updated,
}: {
  created: string | null;
  updated: string | null;
}) {
  if (updated === created) return null;

  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
      <span className="font-semibold italic">Edited</span>
      <span>{formatFullDateTime(updated)}</span>
    </div>
  );
}

// due date + red missing badge in one row
// badge show only when task in_progress or ticket pending/rejected is past due
export function SlideupDueRow({
  type,
  status,
  dueDate,
}: {
  type: DashboardView;
  status: string;
  dueDate: string | null;
}) {
  const missing = isMissingItem(
    { status, due_date: dueDate },
    type === "task" ? ["in_progress"] : ["pending", "rejected"],
    new Date(),
  );

  return (
    <div className="flex items-end gap-8">
      <div className="mt-2 flex items-center gap-2 text-base font-semibold text-black">
        {dueDate === null ? (
          <span>{formatFullDateTime(dueDate)}</span>
        ) : (
          <>
            <span>Due</span>
            <span>{formatFullDateTime(dueDate)}</span>
          </>
        )}
      </div>

      {missing && (
        <div className="flex h-6 items-center rounded-[20px] bg-(--primary-red) px-3 text-sm font-bold text-white">
          Missing
        </div>
      )}
    </div>
  );
}

// scrollable description with clickable links
export function SlideupDescription({
  description,
}: {
  description: string | null;
}) {
  return (
    <div className="mt-4 min-h-0 flex-1 flex flex-col">
      <div className="mb-4 border-t border-gray-300" />
      <div className="min-h-0 pr-5 pb-25 flex-1 overflow-y-auto scrollbar-thin whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
        {description ? (
          renderWithLinks(description)
        ) : (
          <span className="text-gray-400">No description</span>
        )}
      </div>
    </div>
  );
}
