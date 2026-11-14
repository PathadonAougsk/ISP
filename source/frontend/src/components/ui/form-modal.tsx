"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import Button, { type ButtonVariant } from "@/components/ui/button";
import { CloseButton, Slideup } from "@/components/ui/slideup";

// pill button for the modal footer
export function FormButton({
  variant,
  className = "",
  ...props
}: {
  variant: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      variant={variant}
      size="lg"
      {...props}
      className={`min-w-40 font-semibold ${className}`}
    />
  );
}

// saving + error state for every submit. run return true when ok
export function useFormSubmit() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, fallback: string) {
    setSaving(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, setError, run };
}

// Slideup with a title, a scrolling body and a footer bar. `footer` gets the
// close function, so a button can save and then close.
export function FormModal({
  title,
  id,
  onClose,
  error,
  footer,
  children,
}: {
  title: string;
  id: string;
  onClose: () => void;
  error?: string | null;
  footer: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  return (
    <Slideup onClose={onClose}>
      {(close) => (
        <>
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold text-black">{title}</h1>
              <h1 className="text-xl font-semibold text-gray-500">#{id}</h1>
            </div>
            <CloseButton onClose={close} />
          </div>

          <div className="flex min-h-0 flex-1 gap-6 overflow-y-auto scrollbar-thin pb-2">
            {children}
          </div>

          <div className="flex items-center justify-end gap-3">
            {error && <p className="mr-auto text-sm text-red-500">{error}</p>}
            {footer(close)}
          </div>
        </>
      )}
    </Slideup>
  );
}

// one column of the modal body. fields stack here
export function FormColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">{children}</div>
  );
}
