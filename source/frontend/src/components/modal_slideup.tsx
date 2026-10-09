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
  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`slideup-overlay absolute inset-0 ${isClosing ? "slideup-overlay-closing" : ""}`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`slideup-panel absolute bottom-0 left-[10%] h-[90%] w-[80%] p-5 rounded-t-[30px] bg-white ${className} ${isClosing ? "slideup-panel-closing" : ""}`}
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
