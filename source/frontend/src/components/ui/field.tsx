"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";

// Three looks, one per surface the app has:
//   filled   - grey box inside a white modal
//   outlined - bordered pill in the settings dialog
//   panel    - white pill on a green panel (the request table controls)
export type FieldLook = "filled" | "outlined" | "panel";

export const INPUT_LOOK: Record<FieldLook, string> = {
  filled:
    "w-full rounded-[20px] bg-gray-100 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gray-300",
  outlined:
    "h-10 rounded-full border-2 border-(--primary-color-3) bg-white px-4 outline-none placeholder:text-gray-400 focus:border-(--primary-color-2) disabled:opacity-50",
  panel:
    "h-9 rounded-full bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-(--primary-color-2)",
};

// Same looks, minus the native arrow and with room kept for ours. The select
// is always full width, so a width on the component sizes the wrapper.
const SELECT_LOOK: Record<FieldLook, string> = {
  filled: `${INPUT_LOOK.filled} appearance-none`,
  outlined:
    "h-10 w-full appearance-none rounded-full border-2 border-(--primary-color-3) bg-white px-2 pr-8 outline-none focus:border-(--primary-color-2) disabled:opacity-50",
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

// className goes on the outermost element: the label wrapper when the field is
// labelled, the control itself when it is not.
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

// one line of text. readOnly shows the value in a box, with links clickable
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

// many lines of text. grow makes it fill the height its parent leaves
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
  // full text for the tooltip, when the label had to be shortened
  title?: string;
};

// dropdown with our own arrow. placeholder is the first row, for "no choice yet"
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  look = "filled",
  readOnly = false,
  readOnlyText = "",
  className = "",
  ...props
}: Shared & {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: SelectOption;
  readOnlyText?: string;
} & Omit<ComponentPropsWithRef<"select">, "value" | "onChange" | "className">) {
  const { controlClass, wrap } = withLabel(label, className);

  if (readOnly) return wrap(<ReadOnlyBox>{readOnlyText}</ReadOnlyBox>);

  // nothing picked yet reads as a hint, except in settings where every row
  // already has a value
  const dim =
    look !== "outlined" &&
    placeholder !== undefined &&
    String(value) === String(placeholder.value);

  return wrap(
    <div className={`relative ${controlClass}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
        className={`${SELECT_LOOK[look]} cursor-pointer ${
          dim ? "text-gray-500" : "text-black"
        }`}
      >
        {placeholder && (
          <option
            value={placeholder.value}
            className={look === "outlined" ? "" : "text-gray-500"}
          >
            {placeholder.label}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            title={option.title}
            className="text-black"
          >
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        src="/dropdown_arrow.svg"
        className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 ${
          look === "outlined" ? "right-2.5" : "right-2"
        }`}
      />
    </div>,
  );
}
