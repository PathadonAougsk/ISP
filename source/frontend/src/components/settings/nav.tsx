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
<<<<<<< HEAD
=======
  { label: "Log", icon: "log" }
>>>>>>> eb1b7a1 (Convert checking token via server to local)
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
    <nav className="mt-3 flex flex-col gap-0.5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item.label)}
          className={`flex w-full items-center gap-3 px-2 py-2 text-left ${
            active === item.label ? "bg-[#d4d4d4]" : "hover:bg-[#e0e0e0]"
          }`}
        >
          <Icon src={`/${item.icon}.svg`} className="size-5 shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
