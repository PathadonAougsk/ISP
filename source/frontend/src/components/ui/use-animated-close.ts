"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Closing is delayed so the slide down / pop out can play first. Callers render
// the closing class while `isClosing` is true, then get `onClose` once the
// animation is over.
export function useAnimatedClose(onClose: () => void, durationMs: number) {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // first call wins, so a double click cant start two timers
  const handleClose = useCallback(() => {
    if (timerRef.current !== null) return;

    setIsClosing(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onClose();
      setIsClosing(false);
    }, durationMs);
  }, [onClose, durationMs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // stop the timer if we are removed early
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { isClosing, handleClose };
}
