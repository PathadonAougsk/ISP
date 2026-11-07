"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useCurrentAccount } from "@/lib/account";
import Icon from "@/components/icon";
import AccountPanel from "./account";
import Categories from "./category";
import Sidebar from "./sidebar";
import Member from "./member";
import Log from "./log";

// To whom may this function concern
// index.tsx is the heart of this feature it contain sidebar and contents
// sidebar.tsx contain user profile and nav
// nav.tsx basically all the clickble goody that could change the contents
// row.tsx reuseable components.
// settings-style.ts all the shared tailwind classes, change look here first.
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
  const { account, loading, isAdmin, reload } = useCurrentAccount(open);

  const panels: Record<string, React.ReactNode> = {
    // reload so a new username lands in the sidebar too, not just in the row that was edited.
    Account: (
      <AccountPanel account={account} loading={loading} onChanged={reload} />
    ),
    Category: <Categories isAdmin={isAdmin} />,
    Member: <Member account={account} isAdmin={isAdmin} />,
    Log: <Log isAdmin={isAdmin} accountLoading={loading} />,
  };

  // closing = play pop out first, then really close
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // must match duration-150 below
  const handleClose = useCallback(() => {
    if (timerRef.current !== null) return;
    setClosing(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onClose();
      setClosing(false);
    }, 150);
  }, [onClose]);

  // stop timer if unmount early
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  if (!open) return null;

  // starting: = pop in on mount, closing = pop out. no css file change needed
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-150 starting:opacity-0 ${
        closing ? "opacity-0" : ""
      }`}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex h-[92vh] w-[92vw] overflow-hidden rounded-[30px] bg-white text-black shadow-2xl transition duration-150 ease-out starting:scale-95 starting:opacity-0 ${
          closing ? "scale-95 opacity-0" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Sidebar
          username={account?.username}
          role={account?.role}
          active={active}
          onSelect={setActive}
        />

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between px-8 pt-6">
            <h1 className="text-2xl font-bold text-black">{active}</h1>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close settings"
              className="group flex items-center justify-center"
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-gray-300 group-hover:bg-gray-200">
                <Icon src="/close.svg" className="size-4" />
              </span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-8">
            <div className="mx-auto max-w-200 py-8">{panels[active]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
