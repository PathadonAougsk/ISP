"use client";

import { useState } from "react";

import { signOut } from "@/lib/account";
import Icon from "@/components/icon";
import Nav, { accountNav } from "./nav";

export default function Sidebar({
  username,
  active,
  onSelect,
}: {
  username?: string;
  active: string;
  onSelect: (label: string) => void;
}) {
  // signOut hard navigates, so this only has to survive until the page goes
  // away - it is here to stop a second click firing another sign out.
  const [leaving, setLeaving] = useState(false);

  return (
    <aside className="flex w-76.5 shrink-0 flex-col overflow-y-auto border-r border-[#d6d6d6] px-4 py-6">
      <div className="flex items-stretch gap-3 pl-2">
        <Icon
          src="/profile.svg"
          alt="Profile"
          className="size-12 object-cover"
        />
        <div className="flex flex-col justify-center">
          <p className="font-bold">{username ?? "..."}</p>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-[#444] hover:text-black"
          >
            Edit Profiles
            <Icon src="/pencil.svg" className="size-3" />
          </button>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 border border-[#d0d0d0] bg-[#dedede] px-3 py-2.5 text-[#8a8a8a]">
        <Icon src="/search.svg" className="size-4 shrink-0" />
        <input
          placeholder="Search"
          className="w-full bg-transparent outline-none placeholder:text-[#8a8a8a]"
        />
      </label>

      <Nav items={accountNav} active={active} onSelect={onSelect} />

      {/* mt-auto pins it to the bottom however short the nav is. */}
      <button
        type="button"
        onClick={() => {
          setLeaving(true);
          void signOut();
        }}
        disabled={leaving}
        className="mt-auto flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-[#e0e0e0] disabled:opacity-50"
      >
        <Icon src="/logout.svg" className="size-5 shrink-0" />
        <span>{leaving ? "Logging out..." : "Logout"}</span>
      </button>
    </aside>
  );
}
