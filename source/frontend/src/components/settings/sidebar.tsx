"use client";

import { useState } from "react";

import { signOut } from "@/lib/account";
import Avatar from "@/components/avatar";
import Icon from "@/components/icon";
import Nav, { accountNav } from "./nav";

export default function Sidebar({
  username,
  role,
  active,
  onSelect,
}: {
  username?: string;
  role?: string;
  active: string;
  onSelect: (label: string) => void;
}) {
  // signOut hard navigates, so this only has to survive until the page goes
  // away - it is here to stop a second click firing another sign out.
  const [leaving, setLeaving] = useState(false);

  return (
    <aside className="flex w-76.5 shrink-0 flex-col overflow-y-auto scrollbar-thin bg-(--panel-bg) px-4 py-6">
      <div className="flex items-stretch gap-3 pl-2">
        <Avatar name={username} className="size-12" />
        <div className="flex flex-col justify-center">
          <p className="text-lg font-bold">{username ?? "..."}</p>
          <p className="text-sm font-normal text-gray-500">{role ?? "..."}</p>
        </div>
      </div>

      <Nav items={accountNav} active={active} onSelect={onSelect} />

      {/* mt-auto pins it to the bottom however short the nav is. */}
      <button
        type="button"
        onClick={() => {
          setLeaving(true);
          void signOut();
        }}
        disabled={leaving}
        className="mt-auto flex w-full items-center gap-3 rounded-full px-4 py-2 text-left font-semibold text-black hover:bg-(--panel-bg-hover) disabled:opacity-50"
      >
        <Icon src="/logout.svg" className="h-5 w-auto shrink-0" />
        <span>{leaving ? "Logging out..." : "Logout"}</span>
      </button>
    </aside>
  );
}
