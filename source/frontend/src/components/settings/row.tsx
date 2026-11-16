"use client";

import { useState } from "react";

import { maskEmail } from "@/lib/format";
import Button from "@/components/ui/button";
import { CARD } from "./settings-style";

export function EditButton({
  onClick,
  open = false,
  disabled = false,
}: {
  onClick?: () => void;
  open?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="md"
      onClick={onClick}
      disabled={disabled}
      className="w-25 font-semibold"
    >
      {open ? "Cancel" : "Edit"}
    </Button>
  );
}

// `children` is the editor the Edit button opens - under the row, not replacing it, so the current value stays in view.
export default function Row({
  label,
  value,
  reveal,
  action,
  children,
}: {
  label: string;
  value?: string;
  reveal?: boolean;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <span className="flex-1 font-semibold">{label}</span>
        {value && <span>{reveal && !shown ? maskEmail(value) : value}</span>}
        {reveal && value && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            className="-ml-2 flex size-5 items-center justify-center"
            aria-label={shown ? `Hide ${label}` : `Show ${label}`}
            aria-pressed={shown}
          >
            <span
              aria-hidden="true"
              className="size-5 bg-(--primary-color-deep)"
              style={{
                maskImage: `url(${shown ? "/eye-on.svg" : "/eye-off.svg"})`,
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
                WebkitMaskImage: `url(${shown ? "/eye-on.svg" : "/eye-off.svg"})`,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "contain",
              }}
            />
          </button>
        )}
        <div className="flex w-25 justify-end">{action}</div>
      </div>
      {children}
    </div>
  );
}
