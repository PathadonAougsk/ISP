"use client";

import Icon from "@/components/icon";

export type NavItem = {
  label: string;
  icon: string;
};

export const accountNav: NavItem[] = [
  { label: "Account", icon: "account" },
  { label: "Category", icon: "category" },
  { label: "Member", icon: "team" },
  { label: "Log", icon: "log" },
];

export default function Nav({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  onSelect: (label: string) => void;
}) {
  return (
    <nav className="mt-3 flex flex-col gap-1">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item.label)}
          className={`flex w-full items-center gap-3 rounded-full px-4 py-2 text-left ${
            active === item.label
              ? "bg-white font-bold"
              : "font-medium hover:bg-(--panel-bg-hover)"
          }`}
        >
          <Icon src={`/${item.icon}.svg`} className="size-5 shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
