"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SlideupCloseButton } from "@/components/modal_slideup";

// field look. white modal, so field use panel color
export const fieldClass =
  "w-full rounded-[20px] bg-(--panel-bg) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color-2)";

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
      className={`max-h-20 overflow-y-auto rounded-[20px] bg-(--panel-bg) px-3 py-2 text-sm wrap-break-word ${className}`}
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
    "bg-(--primary-color-3) text-black enabled:hover:bg-(--primary-color-3-hover)",
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
