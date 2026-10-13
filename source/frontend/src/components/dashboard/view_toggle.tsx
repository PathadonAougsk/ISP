"use client";

import { useRef, type KeyboardEvent } from "react";

export type DashboardView = "task" | "ticket";
export type DashboardScope = "mine" | "all";

type ToggleProps = {
  labels: string[];
  methods: (() => void)[];
  selectedIndex: number;
  ariaLabel: string;
  widthClassName: string;
  backgroundColor?: string;
  selectedBackgroundColor?: string;
  unselectedTextColor?: string;
  selectedTextColor?: string;
};

function Toggle({
  labels,
  methods,
  selectedIndex,
  ariaLabel,
  widthClassName,
  backgroundColor = "var(--primary-color-2)",
  selectedBackgroundColor = "white",
  unselectedTextColor = "white",
  selectedTextColor = "black",
}: ToggleProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = selectedIndex;

    if (event.key === "ArrowLeft") {
      nextIndex = Math.max(0, selectedIndex - 1);
    } else if (event.key === "ArrowRight") {
      nextIndex = Math.min(labels.length - 1, selectedIndex + 1);
    } else {
      return;
    }

    event.preventDefault();
    methods[nextIndex]?.();
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex h-10 shrink-0 rounded-full ${widthClassName}`}
      style={{ backgroundColor }}
    >
      <div
        className="absolute inset-y-0 left-0 p-1 transition-transform duration-150 ease-out"
        style={{
          width: `${100 / labels.length}%`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{ backgroundColor: selectedBackgroundColor }}
        />
      </div>

      {labels.map((label, index) => {
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
            onClick={methods[index]}
            onKeyDown={handleKeyDown}
            className="relative z-10 h-full flex-1 cursor-pointer rounded-full text-lg font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary-color-2)"
            style={{
              color: selected ? selectedTextColor : unselectedTextColor,
            }}
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
  const labels = ["Task", "Ticket"];

  return (
    <Toggle
      labels={labels}
      methods={[() => onChange("task"), () => onChange("ticket")]}
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
  const labels = [`My ${noun}`, `All ${noun}`];

  return (
    <Toggle
      labels={labels}
      methods={[() => onChange("mine"), () => onChange("all")]}
      selectedIndex={value === "mine" ? 0 : 1}
      ariaLabel="Dashboard scope"
      widthClassName="w-59/100"
    />
  );
}
