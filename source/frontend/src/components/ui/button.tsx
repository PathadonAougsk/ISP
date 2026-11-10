import type { ButtonHTMLAttributes } from "react";

// Colours. globals.css already gives every button a pointer cursor and a
// default cursor while disabled, so only the look lives here.
// `enabled:` on hover so a disabled button keeps its flat colour.
const VARIANT = {
  green:
    "bg-(--primary-color-2) text-white enabled:hover:bg-(--primary-color-2-hover) disabled:opacity-50",
  red: "bg-(--primary-red) text-white enabled:hover:bg-(--primary-red-hover) disabled:opacity-50",
  light:
    "bg-(--primary-color-3) text-white enabled:hover:bg-(--primary-color-3-hover) disabled:opacity-50",
  // waiting on a redirect reads as the hover colour, not a faded black
  dark: "bg-black text-white enabled:hover:bg-gray-700 disabled:bg-gray-700",
  outline:
    "border-2 border-(--primary-color-3) bg-white text-black enabled:hover:bg-(--panel-bg) disabled:opacity-50",
  // waiting on a request: flat grey instead of a faded colour
  busy: "bg-gray-200 text-white",
} as const;

// Height and text size of the usual buttons. Width, weight and extra padding
// come from className, because one size is used at several widths. Leave the
// size out to set the whole lot from className.
const SIZE = {
  sm: "h-6 px-4 text-sm",
  base: "h-8 text-base",
  md: "h-10 text-base",
  lg: "h-10 px-5 text-lg",
  // the round "+" that opens a create form
  circle: "h-9 w-9 text-2xl",
} as const;

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonSize = keyof typeof SIZE;

export default function Button({
  variant,
  size,
  className = "",
  ...props
}: {
  variant: ButtonVariant;
  size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`flex items-center justify-center rounded-full ${
        size ? SIZE[size] : ""
      } ${VARIANT[variant]} ${className}`}
    />
  );
}
