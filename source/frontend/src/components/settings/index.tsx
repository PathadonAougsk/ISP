"use client";

import { useState } from "react";

import { useCurrentAccount } from "@/lib/account";
import Icon from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import AccountPanel from "./account";
import Categories from "./category";
import Sidebar from "./setting-sidebar";
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

  if (!open) return null;

  const panels: Record<string, React.ReactNode> = {
    // reload so a new username lands in the sidebar too, not just in the row that was edited.
    Account: (
      <AccountPanel account={account} loading={loading} onChanged={reload} />
    ),
    Category: <Categories isAdmin={isAdmin} />,
    Member: <Member account={account} isAdmin={isAdmin} />,
    Log: <Log accountLoading={loading} />,
  };

  return (
    <Modal onClose={onClose} className="flex h-[85vh] w-[85vw]">
      {(close) => (
        <>
          {/* fixed width holder, sidebar overlay inside so no push */}
          <div className="relative w-75 shrink-0 max-[1100px]:w-16">
            <Sidebar
              username={account?.username}
              role={account?.role}
              active={active}
              onSelect={setActive}
              isAdmin={isAdmin}
            />
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-start justify-between px-8 pt-6">
              <h1 className="text-2xl font-bold text-black">{active}</h1>
              <button
                type="button"
                onClick={close}
                aria-label="Close settings"
                className="group flex items-center justify-center"
              >
                <span className="flex size-9 items-center justify-center rounded-full group-hover:bg-gray-200">
                  <Icon src="/close.svg" className="h-4 w-auto shrink-0" />
                </span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-8">
              <div className="mx-auto max-w-9/10 py-8">{panels[active]}</div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
