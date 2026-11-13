"use client";

import { useState } from "react";

import { signOut } from "@/lib/account";
import Avatar from "@/components/ui/avatar";
import Icon from "@/components/ui/icon";
import Nav, { accountNav } from "./nav";

export default function Sidebar({
  username,
  role,
  active,
  onSelect,
  isAdmin,
}: {
  username?: string;
  role?: string;
  active: string;
  onSelect: (label: string) => void;
  isAdmin: boolean;
}) {
  const [leaving, setLeaving] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const hide = expanded ? "" : "max-[1100px]:hidden";

  return (
    <aside
      className={`absolute inset-y-0 left-0 z-10 flex w-75 flex-col overflow-y-auto scrollbar-thin bg-(--panel-bg) px-4 py-6 ${
        expanded
          ? "max-[1100px]:shadow-lg"
          : "max-[1100px]:w-20 max-[1100px]:px-4"
      }`}
    >
      <div className="flex min-h-12 items-center gap-3 pb-2">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-label="Toggle sidebar"
          className="shrink-0 cursor-default rounded-full max-[1100px]:cursor-pointer"
        >
          <Avatar name={username} className="size-12" />
        </button>

        <div className={`flex min-w-0 flex-col justify-center ${hide}`}>
          <p className="truncate text-lg font-bold" title={username}>
            {username ?? "..."}
          </p>
          <p className="text-sm font-normal text-gray-500">{role ?? "..."}</p>
        </div>
      </div>

      <Nav
        items={accountNav.filter((item) => isAdmin || item.label !== "Log")}
        active={active}
        onSelect={(label) => {
          setExpanded(false);
          onSelect(label);
        }}
        expanded={expanded}
      />

      <button
        type="button"
        onClick={() => {
          setLeaving(true);
          void signOut();
        }}
        disabled={leaving}
        className="mt-auto flex w-full items-center gap-3 rounded-full px-3.5 h-10 text-left font-semibold text-red-800 hover:bg-(--panel-bg-hover) disabled:opacity-50"
      >
        <Icon src="/logout.svg" className="size-5 shrink-0" />
        <span className={hide}>{leaving ? "Logging out..." : "Logout"}</span>
      </button>
    </aside>
  );
}
