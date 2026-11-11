"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ButtonVariant } from "@/components/ui/button";
import { FormButton } from "@/components/ui/form-modal";
import { Modal } from "@/components/ui/modal";

// Centred "are you sure?" dialog, in place of window.confirm. `onConfirm` is
// the write itself: it never throws, it answers true once the server agreed,
// and only then does the dialog pop out. A false keeps it open so the message
// in `error` can be read and the button pressed again.
export default function ConfirmModal({
  title,
  confirmLabel,
  busyLabel,
  confirmVariant = "red",
  error,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  confirmLabel: string;
  busyLabel: string;
  confirmVariant?: ButtonVariant;
  error?: string | null;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape is read off the panel rather than the window, so the dialog can
  // swallow it. Settings is a Modal too, and it listens on the window.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  async function handleConfirm(close: () => void) {
    setBusy(true);
    const ok = await onConfirm();
    setBusy(false);

    if (ok) close();
  }

  return (
    <Modal onClose={onClose} className="w-[min(90vw,34rem)]">
      {(close) => (
        <div
          ref={panelRef}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;

            // Stops here, so the Escape never reaches the window listeners of
            // this Modal or of the Settings one behind it.
            event.stopPropagation();
            if (!busy) close();
          }}
          className="flex flex-col gap-5 p-7 outline-none"
        >
          <h1 className="text-2xl font-bold text-black">{title}</h1>

          <div className="text-gray-600">{children}</div>

          <div className="flex items-center justify-end gap-3">
            {error && <p className="mr-auto text-sm text-red-500">{error}</p>}

            <FormButton variant="outline-white" onClick={close} disabled={busy}>
              Cancel
            </FormButton>

            <FormButton
              variant={confirmVariant}
              onClick={() => handleConfirm(close)}
              disabled={busy}
            >
              {busy ? busyLabel : confirmLabel}
            </FormButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
