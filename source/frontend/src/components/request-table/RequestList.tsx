"use client";

import type { ReactNode } from "react";
import Icon from "@/components/icon";

// grid class come from caller, full string so tailwind can see it
// ex: "grid-cols-[1fr_2fr_1fr]"
const gridBase = "grid flex-1 items-center gap-3";

// green header bar, same look as dashboard. one title per column
export function RequestListHeader({
  titles,
  gridClassName,
  hasOverflow = false,
}: {
  titles: string[];
  gridClassName: string;
  hasOverflow?: boolean;
}) {
  return (
    <div
      className={`flex h-8 shrink-0 items-center gap-5 rounded-[20px] bg-(--primary-color-2) pl-2 ${
        hasOverflow ? "pr-6" : "pr-4"
      }`}
    >
      <Icon src="/header_donut_dark_green.svg" />
      <div className={`${gridBase} ${gridClassName}`}>
        {titles.map((title) => (
          <h1 key={title} className="truncate text-base font-bold text-white">
            {title}
          </h1>
        ))}
      </div>
    </div>
  );
}

// one clickable white row. lead = mark before cells (icon or dot)
export function RequestListRow({
  gridClassName,
  cells,
  lead,
  overdue = false,
  spacingClassName = "pl-2.5 pr-3.5 gap-5",
  onClick,
}: {
  gridClassName: string;
  cells: string[];
  lead?: ReactNode;
  overdue?: boolean;
  spacingClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full shrink-0 cursor-pointer items-center rounded-[20px] border-2 bg-white text-left hover:bg-gray-100 ${spacingClassName} ${
        overdue
          ? "border-(--primary-red) text-red-700"
          : "border-transparent text-black"
      }`}
    >
      {lead}
      <div className={`${gridBase} ${gridClassName}`}>
        {cells.map((cell, index) => (
          // title show full text when cell is cut
          <p key={index} className="truncate text-sm" title={cell}>
            {cell}
          </p>
        ))}
      </div>
    </button>
  );
}

// true when date is before today (local time). empty = false
export function isPastDate(isoDate: string) {
  if (!isoDate) return false;

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  // iso string compare is ok
  return isoDate < `${now.getFullYear()}-${mm}-${dd}`;
}
