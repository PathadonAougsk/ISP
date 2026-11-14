"use client";

import Icon from "@/components/ui/icon";

export type NavItem = {
  label: string;
  icon: string;
};

export const accountNav: NavItem[] = [
  { label: "Account", icon: "account" },
  { label: "Categories", icon: "category" },
  { label: "Users", icon: "team" },
  { label: "Activity Log", icon: "log" },
];

export default function Nav({
  items,
  active,
  onSelect,
  expanded,
}: {
  items: NavItem[];
  active: string;
  onSelect: (label: string) => void;
  expanded: boolean;
}) {
  return (
    <nav className="mt-3 flex flex-col gap-1">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item.label)}
          className={`flex w-full items-center gap-3 rounded-full px-3.5 h-10 text-left ${
            active === item.label
              ? "bg-white font-bold"
              : "font-medium hover:bg-(--panel-bg-hover)"
          }`}
        >
          <Icon src={`/${item.icon}.svg`} className="size-5 shrink-0 brightness-0" />
          <span className={expanded ? "" : "max-[1100px]:hidden"}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
