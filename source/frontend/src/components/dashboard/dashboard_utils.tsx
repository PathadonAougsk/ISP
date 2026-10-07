"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { formatFullDateTime } from "@/lib/format";
import Icon from "@/components/icon";
import {
  isMissingTask,
  isMissingTicket,
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
  "grid flex-1 grid-cols-[2fr_1.5fr_1.5fr_minmax(120px,1fr)] items-center gap-3";

// green header bar, one title per column
export function ListHeader({
  titles,
  hasOverflow = false,
}: {
  titles: string[];
  hasOverflow?: boolean;
}) {
  return (
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
  );
}

// loading, error or empty text for a list
export function ListMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-base font-medium text-gray-500">
      {children}
    </p>
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
      setHasOverflow(element.scrollHeight > element.clientHeight);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => observer.disconnect();
  }, dependencies);

  return { listRef, hasOverflow };
}

// ==========================================================
// Popup parts
// ==========================================================

type DateInput = string | null;

// must match the popup animation time in globals.css
const POPUP_CLOSE_DELAY_MS = 125;

// close with a short delay so the closing animation can play
export function usePopupClose(onClose: () => void) {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    if (timerRef.current !== null) return;
    setIsClosing(true);
    timerRef.current = setTimeout(onClose, POPUP_CLOSE_DELAY_MS);
  }, [onClose]);

  // close with the Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // stop the timer if the popup is removed early
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { isClosing, handleClose };
}

// dark overlay + white panel. className is for layout that differs per popup
export function PopupFrame({
  isClosing,
  onClose,
  className = "",
  children,
}: {
  isClosing: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`popup-overlay absolute inset-0 ${isClosing ? "popup-overlay-closing" : ""}`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`popup-panel absolute bottom-0 left-[10%] h-[90%] w-[80%] p-5 rounded-t-[30px] bg-white ${className} ${isClosing ? "popup-panel-closing" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

// round close (X) button
export function PopupCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white hover:bg-gray-200"
      aria-label="Close"
    >
      <Icon src="/close.svg" className="h-auto w-5" />
    </button>
  );
}

// id + category + due date row. children are extra items added at the end
export function PopupMeta({
  id,
  categoryName,
  createdDate,
  children,
}: {
  id: number;
  categoryName: string;
  createdDate: DateInput;
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

// red badge. show only when task in_progress or ticket pending is past due
export function PopupMissingBadge({
  type,
  status,
  dueDate,
}: {
  type: "task" | "ticket";
  status: string;
  dueDate: DateInput;
}) {
  const item = { status, due_date: dueDate };
  const now = new Date();
  const missing =
    type === "task" ? isMissingTask(item, now) : isMissingTicket(item, now);

  if (!missing) return null;

  return (
    <div className="flex h-6 items-center rounded-[20px] bg-(--primary-red) px-3 text-sm font-bold text-white">
      Missing
    </div>
  );
}

// shows nothing when the item was never edited
export function PopupEdited({
  created,
  updated,
}: {
  created: DateInput;
  updated: DateInput;
}) {
  if (updated === created) return null;

  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
      <span className="font-semibold italic">Edited</span>
      <span>{formatFullDateTime(updated)}</span>
    </div>
  );
}

export function PopupDuedate({ dueDate }: { dueDate: DateInput }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-base font-semibold text-black">
      <span>Due</span>
      <span>{formatFullDateTime(dueDate)}</span>
    </div>
  );
}

// scrollable description with clickable links
export function PopupDescription({
  description,
}: {
  description: string | null;
}) {
  return (
    <div className="mt-4 min-h-0 pr-5 pb-25 flex-1 overflow-y-auto scrollbar-thin whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
      {description ? (
        renderWithLinks(description)
      ) : (
        <span className="text-gray-400">No description</span>
      )}
    </div>
  );
}
