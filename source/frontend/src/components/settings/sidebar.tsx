"use client";

import Image from "next/image";

import Icon from "./icon";
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
  return (
    <aside className="flex w-76.5 shrink-0 flex-col overflow-y-auto border-r border-[#d6d6d6] px-4 py-6">
      <div className="flex items-stretch gap-3 pl-2">
        <Image
          src="/profile.svg"
          width={48}
          height={48}
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
            <Icon name="pencil" size={12} className="size-3" />
          </button>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 border border-[#d0d0d0] bg-[#dedede] px-3 py-2.5 text-[#8a8a8a]">
        <Icon name="search" size={16} className="size-4 shrink-0" />
        <input
          placeholder="Search"
          className="w-full bg-transparent outline-none placeholder:text-[#8a8a8a]"
        />
      </label>

      <Nav items={accountNav} active={active} onSelect={onSelect} />
    </aside>
  );
}
