"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Category } from "@/lib/category";
import type { Member } from "@/lib/account";
import Icon from "@/components/icon";
import DateInput from "@/components/request-table/DateInput";
import {
  SlideupCloseButton,
  SlideupFrame,
  useSlideupClose,
} from "@/components/modal-slideup";

// field look. white modal, so field use panel color
export const fieldClass =
  "w-full rounded-[20px] bg-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gray-300";

// title + one field. children is input, select, or read only box
export function FormField({
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
      <p className="mb-1 text-sm font-bold text-black">{label}</p>
      {children}
    </div>
  );
}

// same look as field, but no edit
export function ReadOnlyBox({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={`max-h-20 overflow-y-auto rounded-[20px] bg-gray-100 px-3 py-2 text-sm wrap-break-word ${className}`}
    >
      {children}
    </p>
  );
}

// title on left, close button on right
export function FormHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between pb-3">
      <h1 className="text-2xl font-bold text-black">{title}</h1>
      <SlideupCloseButton onClose={onClose} />
    </div>
  );
}

// bottom bar. error show on left, buttons on right
export function FormFooter({
  error,
  children,
}: {
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-gray-300 px-6 py-4">
      {error && <p className="mr-auto text-sm text-red-500">{error}</p>}
      {children}
    </div>
  );
}

// hover only when enabled, so disabled button dont change color
const buttonColors = {
  red: "bg-(--primary-red) text-white enabled:hover:bg-(--primary-red-hover)",
  green:
    "bg-(--primary-color-2) text-white enabled:hover:bg-(--primary-color-2-hover)",
  light:
    "bg-(--primary-color-3) text-white enabled:hover:bg-(--primary-color-3-hover)",
};

// round pill button for the footer
export function FormButton({
  color,
  className = "",
  ...props
}: { color: keyof typeof buttonColors } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-8 min-w-25 cursor-pointer rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${buttonColors[color]} ${className}`}
    />
  );
}

// saving + error state for every submit. run return true when ok
export function useFormSubmit() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, fallback: string) {
    setSaving(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, setError, run };
}

// whole modal shell. footer get the close fn (slide down then unmount)
export function FormModal({
  title,
  onClose,
  error,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  error?: string | null;
  footer: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  const { isClosing, handleClose } = useSlideupClose(onClose);

  return (
    <SlideupFrame isClosing={isClosing} onClose={handleClose}>
      <div className="flex flex-col h-full min-h-0">
        <FormHeader title={title} onClose={handleClose} />

        <div className="flex gap-6 flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>

        <FormFooter error={error}>{footer(handleClose)}</FormFooter>
      </div>
    </SlideupFrame>
  );
}

// left column of the modal body. fields stack here
export function FormColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 pb-4">{children}</div>
  );
}

// text input. readOnly show the box, onChange not needed then
export function TextField({
  label,
  value,
  onChange,
  readOnly = false,
  className,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <FormField label={label} className={className}>
      {readOnly ? (
        <ReadOnlyBox>{value}</ReadOnlyBox>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={fieldClass}
        />
      )}
    </FormField>
  );
}

// category dropdown. readOnlyText is what show when locked
export function SelectField({
  label,
  value,
  onChange,
  categories,
  readOnly = false,
  readOnlyText = "",
  className,
}: {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  categories: Category[];
  readOnly?: boolean;
  readOnlyText?: string;
  className?: string;
}) {
  return (
    <FormField label={label} className={className}>
      {readOnly ? (
        <ReadOnlyBox>{readOnlyText}</ReadOnlyBox>
      ) : (
        <div className="relative">
          <select
            value={value}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : "")
            }
            className={`${fieldClass} appearance-none cursor-pointer ${
              value === "" ? "text-gray-500" : "text-black"
            }`}
          >
            <option value="" className="text-gray-500">
              Select a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="text-black">
                {c.name}
              </option>
            ))}
          </select>
          <img
            src="/dropdown_arrow.svg"
            alt=""
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2"
          />
        </div>
      )}
    </FormField>
  );
}

// date input. value is yyyy-MM-dd
export function DateField({
  label,
  value,
  onChange,
  readOnly = false,
  readOnlyText = "",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  readOnlyText?: string;
  className?: string;
}) {
  return (
    <FormField label={label} className={className}>
      {readOnly ? (
        <ReadOnlyBox>{readOnlyText}</ReadOnlyBox>
      ) : (
        <DateInput value={value} onChange={onChange} className={fieldClass} />
      )}
    </FormField>
  );
}

// description box. editable one fill the free height
export function TextAreaField({
  label,
  value,
  onChange,
  readOnly = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <FormField
      label={label}
      className={`${readOnly ? "" : "flex flex-1 flex-col"} ${className}`}
    >
      {readOnly ? (
        <ReadOnlyBox className="min-h-24 max-h-40!">{value}</ReadOnlyBox>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${fieldClass} min-h-24 flex-1 resize-none scrollbar-none`}
        />
      )}
    </FormField>
  );
}

// right side panel. pick members with checkbox
export function MemberPanel({
  members,
  selectedIds,
  onChange,
  loading = false,
  error = null,
  hint,
}: {
  members: Member[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  error?: string | null;
  hint?: string;
}) {
  function toggleAll() {
    onChange(
      selectedIds.length === members.length ? [] : members.map((m) => m.id),
    );
  }

  function toggle(memberId: string) {
    onChange(
      selectedIds.includes(memberId)
        ? selectedIds.filter((id) => id !== memberId)
        : [...selectedIds, memberId],
    );
  }

  return (
    <div className="w-72 shrink-0 self-start rounded-[20px] bg-(--panel-bg) p-3">
      <div
        className={`flex items-center justify-between ${hint ? "mb-2" : "mb-3"}`}
      >
        <p className="text-base font-bold text-black">
          Members <span className="text-green-800">{members.length}</span>
        </p>
        <button
          type="button"
          onClick={toggleAll}
          disabled={members.length === 0}
          className="cursor-pointer rounded-full bg-(--primary-color-2) px-3 py-1 text-xs font-semibold text-white hover:bg-(--primary-color-2-hover) disabled:opacity-50"
        >
          {members.length > 0 && selectedIds.length === members.length
            ? "Clear all"
            : "Assign all"}
        </button>
      </div>

      {hint && <p className="mb-3 text-xs text-gray-500">{hint}</p>}

      <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="text-xs text-gray-400">Loading members…</div>
        )}
        {error && !loading && (
          <div className="text-xs text-red-500">{error}</div>
        )}
        {!loading &&
          !error &&
          members.map((member) => (
            <label key={member.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(member.id)}
                onChange={() => toggle(member.id)}
                className="h-4 w-4 shrink-0 accent-(--primary-color-2)"
              />
              <Icon src="/profile.svg" className="h-6 w-auto shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium leading-tight text-gray-800">
                  {member.name}
                </div>
                <div className="truncate text-xs leading-tight text-gray-500">
                  {member.email}
                </div>
              </div>
            </label>
          ))}
      </div>
    </div>
  );
}
