"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Icon from "@/components/icon";

// must match the slideup animation time in globals.css
const POPUP_CLOSE_DELAY_MS = 125;

// things that can take focus inside the panel
const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

// close with a short delay so the closing animation can play
export function useSlideupClose(onClose: () => void) {
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

  // stop the timer if the slideup is removed early
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { isClosing, handleClose };
}

// dark overlay + white panel. className is for layout that differs per slideup
export function SlideupFrame({
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
  const panelRef = useRef<HTMLDivElement>(null);

  // real modal: lock page scroll, focus panel, Tab stay inside, restore on close
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    panel.focus();

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      );

      // nothing to focus, stay on panel
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      // focus lost (button got disabled) or on the panel itself
      const outside = !panel.contains(active) || active === panel;

      if (event.shiftKey && (outside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);

    return () => {
      document.removeEventListener("keydown", handleTab);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`blur-fade-in absolute inset-0 ${isClosing ? "blur-fade-out" : ""}`}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`slideup-panel absolute bottom-0 left-[10%] h-[90%] w-[80%] p-5 rounded-t-[30px] bg-white outline-none ${className} ${isClosing ? "slidedown-panel" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

// round close (X) button
export function SlideupCloseButton({ onClose }: { onClose: () => void }) {
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
