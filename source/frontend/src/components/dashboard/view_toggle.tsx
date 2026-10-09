"use client";

import { useRef, type KeyboardEvent } from "react";

export type DashboardView = "task" | "ticket";

const options: { key: DashboardView; label: string }[] = [
  { key: "task", label: "Task" },
  { key: "ticket", label: "Ticket" },
];

export default function ViewToggle({
  value,
  onChange,
}: {
  value: DashboardView;
  onChange: (value: DashboardView) => void;
}) {
  const buttonRefs = useRef<Record<DashboardView, HTMLButtonElement | null>>({
    task: null,
    ticket: null,
  });

  // arrow keys move the selection and the focus together
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next: DashboardView | null =
      event.key === "ArrowLeft"
        ? "task"
        : event.key === "ArrowRight"
          ? "ticket"
          : null;

    if (next === null) return;

    event.preventDefault();
    onChange(next);
    buttonRefs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Dashboard view"
      className="relative flex h-10 w-50 shrink-0 rounded-full bg-(--primary-color-2)"
    >
      <div
        className={`absolute inset-y-0 left-0 w-1/2 p-1 transition-transform duration-150 ease-out ${
          value === "ticket" ? "translate-x-full" : ""
        }`}
      >
        <div className="h-full w-full rounded-full bg-white" />
      </div>

      {options.map((option) => {
        const selected = option.key === value;

        return (
          <button
            key={option.key}
            ref={(element) => {
              buttonRefs.current[option.key] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.key)}
            onKeyDown={handleKeyDown}
            className={`relative z-10 h-full w-1/2 cursor-pointer rounded-full text-lg font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary-color-2) ${
              selected ? "text-black" : "text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
