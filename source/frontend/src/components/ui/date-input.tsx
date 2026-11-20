"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  Field,
  INPUT_LOOK,
  ReadOnlyBox,
  useCloseOnOutside,
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// local date -> "yyyy-MM-dd", no toISOString so no utc shift
function isoOf(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// 6 rows x 7 days, start from sunday on or before day 1
function monthCells(year: number, month: number) {
  const start = 1 - new Date(year, month, 1).getDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, start + index);
    return {
      iso: isoOf(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    };
  });
}

// label with up/down arrow stack on its right
function Stepper({
  label,
  unit,
  canDown,
  onStep,
}: {
  label: string;
  unit: string;
  canDown: boolean;
  onStep: (by: number) => void;
}) {
  const arrow =
    "rounded p-0.5 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center gap-1">
      <span className="min-w-20 font-semibold">{label}</span>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onStep(1)}
          className={arrow}
          aria-label={`Next ${unit}`}
        >
          <Icon src="/dropdown_arrow.svg" className="size-3 rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={!canDown}
          className={arrow}
          aria-label={`Previous ${unit}`}
        >
          <Icon src="/dropdown_arrow.svg" className="size-3" />
        </button>
      </div>
    </div>
  );
}

// Typed as dd/mm/yyyy, held as "yyyy-MM-dd". Past dates are refused, and the
// calendar button opens our calendar popup. Invalid input shows a message
// beside the label and is reported to the parent through onValidityChange.
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
  const [prevValue, setPrevValue] = useState(value);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: 0, month: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const today = todayIso();

  useCloseOnOutside(open, setOpen, boxRef);

  // month count, so compare to today month is easy
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const minKey = todayYear * 12 + todayMonth - 1;
  const viewKey = view.year * 12 + view.month;

  // value changed from outside, so show it in the box
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(toDisplay(value));
  }

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

  // open on picked month, or today month if empty
  function toggleCalendar() {
    if (!open) {
      const [year, month] = (value || today).split("-").map(Number);
      setView({ year, month: month - 1 });
    }
    setOpen(!open);
  }

  // Date handle the year rollover
  function shiftMonth(by: number) {
    const date = new Date(view.year, view.month + by, 1);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  }

  function pick(iso: string) {
    setTouched(true);
    setDraft(toDisplay(iso));
    onChange(iso);
    setOpen(false);
  }

  const field = readOnly ? (
    <ReadOnlyBox>{readOnlyText}</ReadOnlyBox>
  ) : (
    <div
      ref={boxRef}
      className={`relative ${label === undefined ? className : ""}`}
    >
      <div className="relative">
        <input
          name="date"
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={draft}
          onChange={(event) => handleType(event.target.value)}
          aria-invalid={invalid}
          className={`${INPUT_LOOK[look]} rounded-[20px] pr-10 ${
            invalid ? "ring-1 ring-inset ring-red-500" : ""
          }`}
        />

        <button
          type="button"
          onClick={toggleCalendar}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800"
          aria-label="Open calendar"
          aria-expanded={open}
        >
          <Icon src="/calendar.svg" className="size-5" />
        </button>
      </div>

      {open && (
        <div className="absolute top-full right-0 z-9999 mt-2 w-max rounded-[20px] [corner-shape:squircle] border border-gray-200 bg-white p-3 text-sm text-black">
          <div className="mb-2 flex items-center justify-between gap-4 pl-1">
            <Stepper
              label={MONTHS[view.month]}
              unit="month"
              canDown={viewKey > minKey}
              onStep={shiftMonth}
            />
            <Stepper
              label={String(view.year)}
              unit="year"
              canDown={viewKey - 12 >= minKey}
              onStep={(by) => shiftMonth(by * 12)}
            />
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="flex h-6 items-center justify-center text-xs font-semibold text-gray-500"
              >
                {day}
              </span>
            ))}
            {monthCells(view.year, view.month).map((cell) => {
              const past = cell.iso < today;
              const selected = cell.iso === value;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={past}
                  onClick={() => pick(cell.iso)}
                  className={`size-8 rounded-full ${
                    selected
                      ? "bg-(--primary-color-2) text-white"
                      : `${past || !cell.inMonth ? "text-gray-300" : "text-black"} ${past ? "" : "hover:bg-gray-200"}`
                  } ${
                    cell.iso === today && !selected
                      ? "ring-1 ring-inset ring-(--primary-color-1)"
                      : ""
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return label === undefined ? (
    <>
      {message && <p className="mb-1 text-xs text-red-500">{message}</p>}
      {field}
    </>
  ) : (
    <Field
      label={label}
      className={className}
      counter={
        message && (
          <span className="text-xs font-normal text-red-500">{message}</span>
        )
      }
    >
      {field}
    </Field>
  );
}
