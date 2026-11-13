"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import Icon from "@/components/ui/icon";

// Four looks, one per surface the app has:
//   filled   - grey box inside a white modal
//   outlined - bordered pill in the settings dialog
//   outlined-sm - bordered pill in the settings dialog but smaller
//   panel    - white pill on a green panel (the request table controls)
export type InputLook = "filled" | "outlined" | "outlined-sm" | "panel";
export type SelectLook = "filled" | "outlined" | "panel";
export type FieldLook = InputLook | SelectLook;

export const INPUT_LOOK: Record<InputLook, string> = {
  filled:
    "w-full rounded-[20px] bg-gray-100 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gray-300 read-only:focus:ring-0",
  outlined:
    "w-full h-10 rounded-full text-sm border-2 border-(--primary-color-3) bg-white px-4 outline-none placeholder:text-gray-400 focus:border-(--primary-color-2) disabled:opacity-50",
  "outlined-sm":
    "w-full h-8 rounded-full text-sm border-2 border-(--primary-color-3) bg-white px-4 outline-none placeholder:text-gray-400 focus:border-(--primary-color-2) disabled:opacity-50",
  panel:
    "w-full h-9 rounded-full bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-inset focus:ring-(--primary-color-2) read-only:focus:ring-0",
};

// Same looks, minus the native arrow and with room kept for ours.
const SELECT_LOOK: Record<SelectLook, string> = {
  filled: `${INPUT_LOOK.filled} appearance-none`,
  outlined:
    "h-8 w-full text-sm appearance-none rounded-full border-2 border-(--primary-color-3) bg-white pl-3 pr-8 outline-none focus:border-(--primary-color-2) disabled:opacity-50",
  panel: `${INPUT_LOOK.panel} w-full appearance-none truncate pr-8`,
};

// Field label
export function Field({
  label,
  className = "",
  counter,
  look,
  children,
}: {
  label: string;
  className?: string;
  counter?: ReactNode;
  look?: FieldLook;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <p
        className={`mb-1 flex items-end justify-between ${
          look === "outlined" || look === "outlined-sm"
            ? "text-sm font-semibold text-gray-500"
            : "text-base font-bold text-black"
        }`}
      >
        {label}
        {counter}
      </p>
      {children}
    </div>
  );
}

// Read-only field
export function ReadOnlyBox({
  grow = false,
  children,
}: {
  grow?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={`w-full overflow-y-auto scrollbar-thin rounded-[20px] bg-gray-100 px-3 py-2 text-sm wrap-break-word ${
        grow ? "h-full min-h-0 flex-1" : "max-h-20"
      }`}
    >
      {children}
    </p>
  );
}

// Shared field wrapper
function withLabel(
  label: string | undefined,
  className: string,
  look?: FieldLook,
) {
  return {
    controlClass: label === undefined ? className : "",
    wrap: (control: ReactNode, counter?: ReactNode) =>
      label === undefined ? (
        control
      ) : (
        <Field
          label={label}
          className={className}
          counter={counter}
          look={look}
        >
          {control}
        </Field>
      ),
  };
}

// Character counter color
function getCounterColor(value: string, maxLength: number) {
  const percentage = (value.length / maxLength) * 100;

  if (percentage <= 33) return "text-green-500";
  if (percentage <= 66) return "text-yellow-500";
  if (percentage < 100) return "text-orange-500";

  return "text-red-500";
}

// Shared character counter
function CharacterCounter({
  value,
  maxLength,
}: {
  value: string;
  maxLength?: number;
}) {
  if (maxLength === undefined || value.length === 0) {
    return null;
  }

  return (
    <span
      className={`text-xs font-normal ${getCounterColor(value, maxLength)}`}
    >
      {value.length}/{maxLength}
    </span>
  );
}

// Shared props
type Shared = {
  label?: string;
  look?: FieldLook;
  readOnly?: boolean;
  className?: string;
};

export type TextInputProps = Omit<Shared, "look"> & {
  look?: InputLook;
  value: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  showCounter?: boolean;
  inlineCounter?: boolean;
} & Omit<
    ComponentPropsWithRef<"input">,
    "value" | "onChange" | "className" | "maxLength"
  >;

// Textarea props
export type TextAreaProps = Omit<Shared, "look"> & {
  look?: InputLook;
  value: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  grow?: boolean;
  showCounter?: boolean;
  inlineCounter?: boolean;
} & Omit<
    ComponentPropsWithRef<"textarea">,
    "value" | "onChange" | "className" | "maxLength"
  >;

// Text input
export function TextInput({
  label,
  value,
  onChange,
  maxLength,
  showCounter = true,
  inlineCounter = false,
  readOnly = false,
  type = "text",
  look = "filled",
  className = "",
  ...props
}: TextInputProps) {
  const { controlClass, wrap } = withLabel(label, className, look);

  const invalid =
    value.length > 0 && maxLength !== undefined && value.length >= maxLength;

  const counter =
    !readOnly && showCounter ? (
      <CharacterCounter value={value} maxLength={maxLength} />
    ) : null;

  const input = (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      maxLength={maxLength}
      aria-invalid={invalid}
      className={`${INPUT_LOOK[look]} ${controlClass}`}
    />
  );

  // Counter inside box, centered vertically
  const control = inlineCounter ? (
    <div className="relative">
      {input}
      <span
        className={`pointer-events-none pb-1 absolute top-1/2 -translate-y-1/2 ${
          look === "filled" ? "right-3" : "right-4"
        }`}
      >
        {counter}
      </span>
    </div>
  ) : (
    input
  );

  return (
    <div className="flex flex-col gap-1">
      {wrap(control, inlineCounter ? null : counter)}
      {label === undefined && !inlineCounter && counter}
    </div>
  );
}

// Textarea
export function TextArea({
  label,
  value,
  onChange,
  maxLength,
  showCounter = true,
  inlineCounter = false,
  readOnly = false,
  look = "filled",
  grow = false,
  className = "",
  ...props
}: TextAreaProps) {
  const { controlClass, wrap } = withLabel(
    label,
    `${grow ? "flex min-h-0 flex-1 flex-col" : ""} ${className}`,
    look,
  );

  const invalid =
    value.length > 0 && maxLength !== undefined && value.length >= maxLength;

  const counter =
    !readOnly && showCounter ? (
      <CharacterCounter value={value} maxLength={maxLength} />
    ) : null;

  const textarea = (
    <textarea
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      maxLength={maxLength}
      aria-invalid={invalid}
      className={`${INPUT_LOOK[look]} min-h-24 flex-1 resize-none scrollbar-thin ${controlClass}`}
    />
  );

  // Counter stays bottom right inside box
  const control = inlineCounter ? (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {textarea}
      <span
        className={`pointer-events-none absolute bottom-2 ${
          look === "filled" ? "right-3" : "right-4"
        }`}
      >
        {counter}
      </span>
    </div>
  ) : (
    textarea
  );

  return (
    <div
      className={`flex flex-col gap-1 ${
        label !== undefined || grow ? "min-h-0 flex-1" : ""
      }`}
    >
      {wrap(control, inlineCounter ? null : counter)}
      {label === undefined && !inlineCounter && counter}
    </div>
  );
}

// Select option
export type SelectOption = {
  value: string | number;
  label: string;
  title?: string;
};

// Close dropdown when clicking outside or pressing Escape
function useCloseOnOutside(
  open: boolean,
  setOpen: (open: boolean) => void,
  ref: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;

    const handleDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, setOpen, ref]);
}

// Dropdown
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  firstItem,
  look = "filled",
  readOnly = false,
  readOnlyText = "",
  className = "",
  disabled,
}: Omit<Shared, "look"> & {
  look?: SelectLook;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: SelectOption;
  firstItem?: SelectOption;
  readOnlyText?: string;
} & Omit<ComponentPropsWithRef<"select">, "value" | "onChange" | "className">) {
  const { controlClass, wrap } = withLabel(label, className);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useCloseOnOutside(open, setOpen, boxRef);

  if (readOnly) {
    return wrap(<ReadOnlyBox>{readOnlyText}</ReadOnlyBox>);
  }

  const rows = firstItem ? [firstItem, ...options] : options;

  const current = options.find((row) => String(row.value) === String(value));

  const dim = !current && placeholder !== undefined;

  function pick(next: string | number) {
    setOpen(false);
    onChange(String(next));
  }

  return wrap(
    <div ref={boxRef} className={`relative ${controlClass}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`relative ${SELECT_LOOK[look]} transform-none! cursor-pointer truncate text-left ${
          dim ? "text-gray-500" : "text-black"
        }`}
      >
        {current?.label ?? placeholder?.label}

        <Icon
          src="/dropdown_arrow.svg"
          className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 ${
            look === "outlined" ? "right-2.5" : "right-2"
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-9999 mt-2 max-h-60 w-max min-w-full overflow-y-auto overflow-x-hidden scrollbar-none rounded-2xl border border-gray-200 bg-white text-black">
          {rows.map((row, index) => (
            <button
              key={row.value}
              type="button"
              title={row.title}
              onClick={() => pick(row.value)}
              className={`block w-full transform-none! cursor-pointer px-3 py-2 text-left text-sm font-normal whitespace-nowrap hover:bg-gray-200 ${
                index === 0 && firstItem ? "text-gray-600" : "text-black"
              }`}
            >
              {row.label}
            </button>
          ))}
        </div>
      )}
    </div>,
  );
}
