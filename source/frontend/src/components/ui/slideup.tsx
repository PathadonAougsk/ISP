"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { useAnimatedClose } from "@/components/ui/use-animated-close";

// must match the slideup animation time in globals.css
const CLOSE_MS = 125;

// things that can take focus inside the panel
const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

// round close (X) button
export function CloseButton({ onClose }: { onClose: () => void }) {
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

// Dark overlay + white panel sliding up from the bottom. A real modal: page
// scroll is locked, Tab stays inside and focus goes back where it was.
// `children` is given the close function, which plays the slide down first.
export function Slideup({
  onClose,
  children,
}: {
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const { isClosing, handleClose } = useAnimatedClose(onClose, CLOSE_MS);
  const panelRef = useRef<HTMLDivElement>(null);

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
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`slideup-panel absolute bottom-0 left-[10%] flex max-h-200 h-[90%] w-[80%] flex-col rounded-t-[30px] bg-white px-5 pt-5 pb-2 outline-none ${
          isClosing ? "slidedown-panel" : ""
        }`}
      >
        {children(handleClose)}
      </div>
    </div>
  );
}
