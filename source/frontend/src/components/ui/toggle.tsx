"use client";

import { useRef, type KeyboardEvent } from "react";

// Pill with one button per option and a white marker sliding behind the
// selected one. Arrow keys move between them.
export default function Toggle({
  options,
  selectedIndex,
  ariaLabel,
  widthClassName,
}: {
  options: { label: string; onClick: () => void }[];
  selectedIndex: number;
  ariaLabel: string;
  widthClassName: string;
}) {
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
            className={`relative z-10 h-full flex-1 rounded-full text-lg font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary-color-2) ${
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
