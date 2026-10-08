"use client";

import { useState } from "react";

import { maskEmail } from "@/lib/format";

export function EditButton() {
  return (
    <button
      type="button"
      className="h-10 w-25 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8]"
    >
      Edit
    </button>
  );
}

export default function Row({
  label,
  value,
  reveal,
  action,
  is_admin,
}: {
  label: string;
  value?: string;
  reveal?: boolean;
  action: React.ReactNode;
  is_admin?: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1">{label}</span>
      {value && <span>{reveal && !shown ? maskEmail(value) : value}</span>}
      {reveal && value && (
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="-ml-2 text-[#9a6fc9] hover:underline"
        >
          {is_admin ? "Hide" : shown ? "Hide" : "Reveal"}
        </button>
      )}
      <div className="flex w-25 justify-end">{action}</div>
    </div>
  );
}
