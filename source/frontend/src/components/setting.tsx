"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { type Account } from "@/lib/account";
import { useCurrentAccount } from "@/lib/current_account";
import Categories from "./category";

function Icon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  );
}

type NavItem = {
  label: string;
  icon: string;
};

const iconClass = "size-5 shrink-0";

const accountNav: NavItem[] = [
  { label: "Account", icon: "account" },
  { label: "Category", icon: "category" },
];

function EditButton() {
  return (
    <button
      type="button"
      className="h-10 w-25 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8]"
    >
      Edit
    </button>
  );
}

// "someone@example.com" -> "***********@example.com"
function mask(value: string) {
  const at = value.indexOf("@");
  return at > 0 ? "*".repeat(at) + value.slice(at) : "*".repeat(value.length);
}

function Row({
  label,
  value,
  reveal,
  action,
}: {
  label: string;
  value?: string;
  reveal?: boolean;
  action: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1">{label}</span>
      {value && <span>{reveal && !shown ? mask(value) : value}</span>}
      {reveal && value && (
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="-ml-2 text-[#9a6fc9] hover:underline"
        >
          {shown ? "Hide" : "Reveal"}
        </button>
      )}
      <div className="flex w-25 justify-end">{action}</div>
    </div>
  );
}

function AccountPanel({
  account,
  loading,
}: {
  account: Account | null;
  loading: boolean;
}) {
  const placeholder = loading ? "Loading..." : "Not available";

  return (
    <>
      <section className="flex flex-col gap-7">
        <h2 className="text-[28px] leading-tight">Account Info</h2>
        <Row
          label="Username"
          value={account?.username ?? placeholder}
          action={<EditButton />}
        />
        <Row
          label="Email"
          value={account?.email ?? placeholder}
          reveal={Boolean(account)}
          action={<EditButton />}
        />
      </section>

      <hr className="my-12 border-[#d0d0d0]" />

      <section className="flex flex-col gap-7">
        <h2 className="text-[28px] leading-tight">Password & Security</h2>
        <Row label="Password" action={<EditButton />} />
      </section>
    </>
  );
}

export default function Settings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState("Account");
  const { account, loading } = useCurrentAccount(open);

  const panels: Record<string, React.ReactNode> = {
    Account: <AccountPanel account={account} loading={loading} />,
    Category: <Categories />,
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const isActive = active === item.label;
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => setActive(item.label)}
          className={`flex w-full items-center gap-3 px-2 py-2 text-left ${
            isActive ? "bg-[#d4d4d4]" : "hover:bg-[#e0e0e0]"
          }`}
        >
          <Icon name={item.icon} className={iconClass} />
          <span>{item.label}</span>
        </button>
      );
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 font-mono"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[92vh] w-[92vw] overflow-hidden border border-[#9a6fc9] bg-[#ececec] text-[#1a1a1a] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
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
              <p className="font-bold">{account?.username ?? "..."}</p>
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

          <nav className="mt-3 flex flex-col gap-0.5">
            {renderNav(accountNav)}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#d6d6d6] px-4 py-4">
            <h1 className="text-base">{active}</h1>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="p-1 hover:bg-[#dcdcdc]"
            >
              <Icon name="close" className="size-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-8">
            <div className="mx-auto max-w-175 py-20">{panels[active]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
