"use client";

import { useEffect, useState } from "react";

import { useCurrentAccount } from "@/lib/current_account";
import AccountPanel from "./account";
import Categories from "./category";
import Icon from "./icon";
import Sidebar from "./sidebar";
import Member from "./member";

// To whom may this function concern
// index.tsx is the heart of this feature it contain sidebar and contents
// sidebar.tsx contain user profile and nav
// nav.tsx basically all the clickble goody that could change the contents
// row.tsx reuseable components.
//
// So if you want to add another new features
// make the function and put it in nav.tsx and const panels (This file)

export default function Settings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState("Account");
  const {account, loading, isAdmin} = useCurrentAccount(open);

  const panels: Record<string, React.ReactNode> = {
    Account: <AccountPanel account={account} loading={loading} />,
    Category: <Categories isAdmin={isAdmin} />,
    Member: <Member account={account} isAdmin={isAdmin} />
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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
        <Sidebar
          username={account?.username}
          active={active}
          onSelect={setActive}
        />

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
