import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icon from "@/components/ui/icon";

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
  "outline-white":
    "border-2 border-gray-300 bg-white text-black enabled:hover:bg-gray-100 disabled:opacity-50",
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
  circle: "h-8 w-8",
} as const;

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: "h-4 w-auto",
  base: "h-6 w-auto",
  md: "h-8 w-auto",
  lg: "h-8 w-auto",
  circle: "h-4 w-auto",
};

// shrink on click
const PRESS = "transition-transform duration-50 enabled:active:scale-95";

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonSize = keyof typeof SIZE;

export default function Button({
  variant,
  size,
  icon,
  iconColor = "black",
  className = "",
  children,
  ...props
}: {
  variant: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconColor?: "white" | "black";
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const iconOnly = !!icon && children == null;
  const whiteIcon = variant === "busy" || iconColor === "white";

  // no size: icon only button get small square
  const sizeClass = size ? SIZE[size] : iconOnly ? "h-6 w-6" : "";

  return (
    <button
      type="button"
      {...props}
      className={`flex shrink-0 items-center justify-center gap-2 rounded-full ${PRESS} ${sizeClass} ${VARIANT[variant]} ${className}`}
    >
      {icon && (
        <Icon
          src={icon}
          className={`block shrink-0 object-contain ${
            size ? ICON_SIZE[size] : "h-4 w-auto"
          } ${whiteIcon ? "brightness-0 invert" : "brightness-0"}`}
        />
      )}
      {children}
    </button>
  );
}
