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
import { renderWithLinks } from "@/components/dashboard/render_link";

type DateInput = Parameters<typeof formatFullDateTime>[0];

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
        className={`popup-overlay absolute inset-0 bg-black ${isClosing ? "popup-overlay-closing" : ""}`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`popup-panel absolute bottom-0 left-[10%] h-[90%] w-[80%] rounded-t-[30px] bg-white p-5 ${className} ${isClosing ? "popup-panel-closing" : ""}`}
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
  dueDate,
  children,
}: {
  id: number;
  categoryName: string;
  dueDate: DateInput;
  children?: ReactNode;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-12 gap-y-2 text-sm text-gray-600">
      <span className="font-semibold">#{id}</span>
      <div className="flex items-center gap-2">
        <Icon src="/header_donut_gray.svg" />
        <span>{categoryName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon src="/clock.svg" />
        <span>{formatFullDateTime(dueDate)}</span>
      </div>
      {children}
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
      <Icon src="/clock.svg" />
      <span>{formatFullDateTime(updated)}</span>
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
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-line wrap-break-word text-base font-normal text-gray-700">
      {description ? (
        renderWithLinks(description)
      ) : (
        <span className="text-gray-400">No description</span>
      )}
    </div>
  );
}
