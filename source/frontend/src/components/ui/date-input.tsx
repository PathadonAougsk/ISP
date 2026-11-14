"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  Field,
  INPUT_LOOK,
  ReadOnlyBox,
  type FieldLook,
} from "@/components/ui/field";
import { todayIso } from "@/lib/format";

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

// Typed as dd/mm/yyyy, held as "yyyy-MM-dd". Past dates are refused, and the
// calendar button opens the native picker. Invalid input shows a message
// below the box and is reported to the parent through onValidityChange.
export default function DateInput({
  label,
  value,
  onChange,
  onValidityChange,
  look = "filled",
  readOnly = false,
  readOnlyText = "",
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (invalid: boolean) => void;
  look?: FieldLook;
  readOnly?: boolean;
  readOnlyText?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(toDisplay(value));
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const today = todayIso();

  useEffect(() => {
    setDraft(toDisplay(value));
  }, [value]);

  const typedIso = toIso(draft);
  const invalid =
    touched && draft !== "" && (typedIso === null || typedIso < today);

  let message: string | null = null;
  if (invalid) {
    if (typedIso !== null) {
      message = "Due date can't be in the past.";
    } else if (draft.length === 10) {
      message = "This date doesn't exist.";
    } else {
      message = "Enter a full date as dd/mm/yyyy.";
    }
  }

  useEffect(() => {
    onValidityChange?.(invalid);
  }, [invalid, onValidityChange]);

  function handleType(raw: string) {
    const formatted = autoSlash(raw);
    setTouched(true);
    setDraft(formatted);

    if (formatted === "") {
      onChange("");
      return;
    }

    const iso = toIso(formatted);
    if (iso && iso >= today) onChange(iso);
  }

  const field = readOnly ? (
    <ReadOnlyBox>{readOnlyText}</ReadOnlyBox>
  ) : (
    <div className={`relative ${label === undefined ? className : ""}`}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={draft}
          onChange={(event) => handleType(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={invalid}
          className={`${INPUT_LOOK[look]} rounded-[20px] pr-10 ${
            invalid ? "ring-1 ring-inset ring-red-500" : ""
          }`}
        />

        <button
          type="button"
          onClick={() => pickerRef.current?.showPicker()}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800"
          aria-label="Open calendar"
        >
          <Icon src="/calendar.svg" className="h-5 w-5" />
        </button>

        {/* Hidden native picker, only used for the calendar popup */}
        <input
          ref={pickerRef}
          type="date"
          value={value}
          min={today}
          onChange={(event) => {
            setDraft(toDisplay(event.target.value));
            onChange(event.target.value);
          }}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
        />
      </div>
    </div>
  );

  return label === undefined ? (
    <>
      {field}
      {message && <p className="mt-1 text-xs text-red-500">{message}</p>}
    </>
  ) : (
    <Field label={label} className={className}>
      <div>
        {field}
        {message && <p className="mt-1 text-xs text-red-500">{message}</p>}
      </div>
    </Field>
  );
}
