"use client";

import { useState } from "react";

import { maskEmail } from "@/lib/format";

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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-25 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8] disabled:opacity-50"
    >
      {open ? "Cancel" : "Edit"}
    </button>
  );
}

// `children` is the editor the Edit button opens - under the row, not replacing it, so the current value stays in view.
export default function Row({
  label,
  value,
  reveal,
  action,
  is_admin,
  children,
}: {
  label: string;
  value?: string;
  reveal?: boolean;
  action: React.ReactNode;
  is_admin?: boolean;
  children?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex-1">{label}</span>
        {value && <span>{reveal && !shown ? maskEmail(value) : value}</span>}
        {reveal && value && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            className="-ml-2 text-(--primary-color-deep) hover:underline"
          >
            {is_admin ? "Hide" : shown ? "Hide" : "Reveal"}
          </button>
        )}
        <div className="flex w-25 justify-end">{action}</div>
      </div>
      {children}
    </div>
  );
}
