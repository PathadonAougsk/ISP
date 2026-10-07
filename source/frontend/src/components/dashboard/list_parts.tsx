import { ReactNode, useEffect, useRef, useState } from "react";
import Icon from "@/components/icon";

// same grid for header and row, so column line up
export const listGridClass =
  "grid flex-1 grid-cols-[2fr_1.5fr_1.5fr_minmax(120px,1fr)] items-center gap-3";

// green header bar, one title per column
export function ListHeader({
  titles,
  hasOverflow = false,
}: {
  titles: string[];
  hasOverflow?: boolean;
}) {
  return (
    <div
      className={`flex h-8 shrink-0 items-center gap-5 rounded-[20px] bg-(--primary-color-2) pl-2 ${
        hasOverflow ? "pr-6" : "pr-4"
      }`}
    >
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

// overflown detection
export function useListOverflow(dependencies: unknown[]) {
  const [hasOverflow, setHasOverflow] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = listRef.current;

    if (!element) {
      return;
    }

    const checkOverflow = () => {
      setHasOverflow(element.scrollHeight > element.clientHeight);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => observer.disconnect();
  }, dependencies);

  return { listRef, hasOverflow };
}
