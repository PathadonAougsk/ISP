"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";

// Four looks, one per surface the app has:
//   filled   - grey box inside a white modal
//   outlined - bordered pill in the settings dialog
//   outlined-sm - bordered pill in the settings dialog but smaller
//   panel    - white pill on a green panel (the request table controls)
export type InputLook = "filled" | "outlined" | "outlined-sm" | "panel";
export type SelectLook = "filled" | "outlined" | "panel";
type FieldLook = InputLook | SelectLook;

export const INPUT_LOOK: Record<InputLook, string> = {
  filled:
    "w-full rounded-[20px] bg-gray-100 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gray-300",
  outlined:
    "h-10 rounded-full text-base border-2 border-(--primary-color-3) bg-white px-4 outline-none placeholder:text-gray-400 focus:border-(--primary-color-2) disabled:opacity-50",
  "outlined-sm":
    "h-8 rounded-full text-base border-2 border-(--primary-color-3) bg-white px-4 outline-none placeholder:text-gray-400 focus:border-(--primary-color-2) disabled:opacity-50",
  panel:
    "h-9 rounded-full bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-(--primary-color-2)",
};

// Same looks, minus the native arrow and with room kept for ours. The select
// is always full width, so a width on the component sizes the wrapper.
const SELECT_LOOK: Record<SelectLook, string> = {
  filled: `${INPUT_LOOK.filled} appearance-none`,
  outlined:
    "h-8 w-full text-sm appearance-none rounded-full border-2 border-(--primary-color-3) bg-white pl-3 pr-8 outline-none focus:border-(--primary-color-2) disabled:opacity-50",
  panel: `${INPUT_LOOK.panel} w-full appearance-none truncate pr-8`,
};

// title above one control. children is an input, a select or a read only box
export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-base font-bold text-black">{label}</p>
      {children}
    </div>
  );
}

// same look as a filled field, but no edit. grow fills the free height
export function ReadOnlyBox({
  grow = false,
  children,
}: {
  grow?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={`overflow-y-auto scrollbar-thin rounded-[20px] bg-gray-100 px-3 py-2 text-sm wrap-break-word ${
        grow ? "h-full min-h-0 flex-1" : "max-h-20"
      }`}
    >
      {children}
    </p>
  );
}

function withLabel(label: string | undefined, className: string) {
  return {
    controlClass: label === undefined ? className : "",
    wrap: (control: ReactNode) =>
      label === undefined ? (
        control
      ) : (
        <Field label={label} className={className}>
          {control}
        </Field>
      ),
  };
}

type Shared = {
  label?: string;
  look?: FieldLook;
  readOnly?: boolean;
  className?: string;
};

// text input
export function TextInput({
  label,
  value,
  onChange,
  look = "filled",
  readOnly = false,
  className = "",
  ...props
}: Shared & {
  value: string;
  onChange?: (value: string) => void;
} & Omit<ComponentPropsWithRef<"input">, "value" | "onChange" | "className">) {
  const { controlClass, wrap } = withLabel(label, className);

  if (readOnly)
    return wrap(<ReadOnlyBox>{renderWithLinks(value)}</ReadOnlyBox>);

  return wrap(
    <input
      type="text"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
      className={`${INPUT_LOOK[look]} ${controlClass}`}
    />,
  );
}

// textarea
export function TextArea({
  label,
  value,
  onChange,
  look = "filled",
  readOnly = false,
  grow = false,
  className = "",
  ...props
}: Shared & {
  value: string;
  onChange?: (value: string) => void;
  grow?: boolean;
} & Omit<
    ComponentPropsWithRef<"textarea">,
    "value" | "onChange" | "className"
  >) {
  const { controlClass, wrap } = withLabel(
    label,
    `${grow ? "flex min-h-0 flex-1 flex-col" : ""} ${className}`,
  );

  if (readOnly)
    return wrap(
      <ReadOnlyBox grow={grow}>
        <span className="whitespace-pre-line">{renderWithLinks(value)}</span>
      </ReadOnlyBox>,
    );

  return wrap(
    <textarea
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
      className={`${INPUT_LOOK[look]} min-h-24 flex-1 resize-none scrollbar-thin ${controlClass}`}
    />,
  );
}

export type SelectOption = {
  value: string | number;
  label: string;
  title?: string;
};

// dropdown with our own arrow. placeholder is the first row, for "no choice yet"
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

  // Click outside or Escape closes the list.
  useEffect(() => {
    if (!open) return;

    const handleDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
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
  }, [open]);

  if (readOnly) {
    return wrap(<ReadOnlyBox>{readOnlyText}</ReadOnlyBox>);
  }

  const rows: SelectOption[] = firstItem ? [firstItem, ...options] : options;

  // Only search actual options for the displayed value.
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
        <div className="absolute top-full left-0 z-9999 mt-2 w-max min-w-full max-h-60 overflow-y-auto overflow-x-hidden scrollbar-none rounded-2xl border border-gray-200 bg-white text-black">
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
