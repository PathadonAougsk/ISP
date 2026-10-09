"use client";
import { useEffect, useRef, useState } from "react";

// "2026-10-09" -> "09/10/2026"
function toDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// "09/10/2026" -> "2026-10-09", or null if it isn't a real date
function toIso(display: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const valid =
    date.getFullYear() === Number(yyyy) &&
    date.getMonth() === Number(mm) - 1 &&
    date.getDate() === Number(dd);

  return valid ? `${yyyy}-${mm}-${dd}` : null;
}

// Keeps only digits and inserts the slashes: "0910" -> "09/10"
function autoSlash(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += "/" + digits.slice(2, 4);
  if (digits.length > 4) out += "/" + digits.slice(4);
  return out;
}

export default function DateInput({
  value,
  onChange,
  className = "",
}: {
  value: string; // "yyyy-MM-dd" or ""
  onChange: (value: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(toDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  // Follow the value when it changes from outside (e.g. the calendar picker)
  useEffect(() => {
    setDraft(toDisplay(value));
  }, [value]);

  function handleType(raw: string) {
    const formatted = autoSlash(raw);
    setDraft(formatted);

    if (formatted === "") {
      onChange("");
      return;
    }
    const iso = toIso(formatted);
    if (iso) onChange(iso);
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={draft}
        onChange={(e) => handleType(e.target.value)}
        // Half-typed or invalid text goes back to the last valid date
        onBlur={() => setDraft(toDisplay(value))}
        className={`${className} pr-10`}
      />

      <button
        type="button"
        onClick={() => pickerRef.current?.showPicker()}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
        aria-label="Open calendar"
      >
        📅
      </button>

      {/* Hidden native picker, only used for the calendar popup */}
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="absolute right-0 bottom-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}
