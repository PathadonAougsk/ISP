"use client";

import type { ReactNode } from "react";
import { useAnimatedClose } from "@/components/ui/use-animated-close";

// must match the duration-150 below
const CLOSE_MS = 150;

// Centred dialog that pops in and out. Click the backdrop or press Escape to
// close. `children` is given the close function, which plays the pop out first.
export function Modal({
  onClose,
  className = "",
  children,
}: {
  onClose: () => void;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const { isClosing, handleClose } = useAnimatedClose(onClose, CLOSE_MS);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-150 starting:opacity-0 ${
        isClosing ? "opacity-0" : ""
      }`}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`overflow-hidden rounded-[30px] bg-white text-black transition duration-150 ease-out starting:scale-95 starting:opacity-0 ${className} ${
          isClosing ? "scale-95 opacity-0" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {children(handleClose)}
      </div>
    </div>
  );
}
