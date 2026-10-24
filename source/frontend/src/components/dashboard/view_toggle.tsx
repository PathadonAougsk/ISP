"use client";

import { useRef, type KeyboardEvent } from "react";
import type { DashboardView } from "@/components/dashboard/dashboard_status";

export type DashboardScope = "mine" | "all";

type ToggleProps = {
  options: { label: string; onClick: () => void }[];
  selectedIndex: number;
  ariaLabel: string;
  widthClassName: string;
};

function Toggle({
  options,
  selectedIndex,
  ariaLabel,
  widthClassName,
}: ToggleProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = selectedIndex;

    if (event.key === "ArrowLeft") {
      nextIndex = Math.max(0, selectedIndex - 1);
    } else if (event.key === "ArrowRight") {
      nextIndex = Math.min(options.length - 1, selectedIndex + 1);
    } else {
      return;
    }

    event.preventDefault();
    options[nextIndex]?.onClick();
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex h-10 shrink-0 rounded-full bg-(--primary-color-2) ${widthClassName}`}
    >
      <div
        className="absolute inset-y-0 left-0 p-1 transition-transform duration-150 ease-out"
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      >
        <div className="h-full w-full rounded-full bg-white" />
      </div>

      {options.map(({ label, onClick }, index) => {
        const selected = index === selectedIndex;

        return (
          <button
            key={label}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            className={`relative z-10 h-full flex-1 cursor-pointer rounded-full text-lg font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary-color-2) ${
              selected ? "text-black" : "text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function ViewToggle({
  value,
  onChange,
}: {
  value: DashboardView;
  onChange: (value: DashboardView) => void;
}) {
  return (
    <Toggle
      options={[
        { label: "Task", onClick: () => onChange("task") },
        { label: "Ticket", onClick: () => onChange("ticket") },
      ]}
      selectedIndex={value === "task" ? 0 : 1}
      ariaLabel="Dashboard view"
      widthClassName="w-39/100"
    />
  );
}

export function ScopeToggle({
  value,
  onChange,
  view,
}: {
  value: DashboardScope;
  onChange: (value: DashboardScope) => void;
  view: DashboardView;
}) {
  const noun = view === "ticket" ? "Tickets" : "Tasks";

  return (
    <Toggle
      options={[
        { label: `My ${noun}`, onClick: () => onChange("mine") },
        { label: `All ${noun}`, onClick: () => onChange("all") },
      ]}
      selectedIndex={value === "mine" ? 0 : 1}
      ariaLabel="Dashboard scope"
      widthClassName="w-59/100"
    />
  );
}
