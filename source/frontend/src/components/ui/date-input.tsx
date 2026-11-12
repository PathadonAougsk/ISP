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
  value: string; // "yyyy-MM-dd" or ""
  onChange: (value: string) => void;
  onValidityChange?: (invalid: boolean) => void;
  look?: FieldLook;
  readOnly?: boolean;
  readOnlyText?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(toDisplay(value));
  // only judge what the user typed, so an old past due date isn't flagged on open
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const today = todayIso();

  // Follow the value when it changes from outside (e.g. the calendar picker)
  useEffect(() => {
    setDraft(toDisplay(value));
  }, [value]);

  const typedIso = toIso(draft);
  const invalid =
    touched && draft !== "" && (typedIso === null || typedIso < today);

  let message: string | null = null;
  if (invalid) {
    if (typedIso !== null) message = "Due date can't be in the past.";
    else if (draft.length === 10) message = "This date doesn't exist.";
    else if (!focused) message = "Enter a full date as dd/mm/yyyy.";
  }

  // tell the parent so it can block create/save
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
    // past date not allowed, so skip it (iso string compare is ok)
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
          // keep the text on blur so the error stays visible
          onBlur={() => setFocused(false)}
          aria-invalid={invalid}
          className={`${INPUT_LOOK[look]} pr-10 ${
            invalid ? "outline outline-red-500" : ""
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
            // picking a date replaces whatever invalid text was typed
            setDraft(toDisplay(event.target.value));
            onChange(event.target.value);
          }}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
        />
      </div>

      {/* with a label: sits on the label row, right side. without: below the box */}
      {message && (
        <p
          className={`text-xs text-red-500 ${
            label === undefined
              ? "mt-1"
              : "absolute right-0 bottom-full mb-1 whitespace-nowrap"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );

  return label === undefined ? (
    field
  ) : (
    <Field label={label} className={className}>
      {field}
    </Field>
  );
}
