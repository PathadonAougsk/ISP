import type { ReactNode } from "react";
import Icon from "@/components/icon";

// same grid for header and row, so column line up
export const listGridClass =
  "grid flex-1 grid-cols-[2fr_1.5fr_1.5fr_minmax(120px,1fr)] items-center gap-2";

// green header bar, one title per column
export function ListHeader({ titles }: { titles: string[] }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
      <Icon src="/header_donut_dark_green.svg" />
      <div className={listGridClass}>
        {titles.map((title) => (
          <h1 key={title} className="truncate text-base font-bold text-white">
            {title}
          </h1>
        ))}
      </div>
    </div>
  );
}

// loading, error or empty text for a list
export function ListMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-base font-medium text-gray-500">
      {children}
    </p>
  );
}
