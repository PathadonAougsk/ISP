"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, onAccountChange, type Account } from "@/lib/account";
import Avatar from "@/components/ui/avatar";
import { clearAllApiCache } from "@/lib/cache/cache";

export default function Topbar() {
  const pathname = usePathname().split("/")[1];
  const [account, setAccount] = useState<Account | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      getMe()
        .then(setAccount)
        .catch(() => setAccount(undefined))
        .finally(() => setIsLoading(false));

    load();
    // refetch after account write, so username change show up
    return onAccountChange(() => {
      getMe({ force: true })
        .then(setAccount)
        .catch(() => setAccount(undefined));
    });
  }, []);

  return (
    <div className="sticky top-0 z-10 flex h-15 w-full flex-row items-center justify-between bg-(--primary-color-3) p-7.5">
      <h1
        className="cursor-pointer text-3xl font-bold"
        onClick={async () => {
          await clearAllApiCache();
          window.location.reload();
        }}
      >
        {pathname[0]?.toUpperCase() + pathname.slice(1)}
      </h1>

      <div
        className={`flex flex-row items-center justify-center gap-5 text-center ${isLoading ? "invisible" : ""}`}
      >
        {!isLoading && account && (
          <>
            <div className="hidden items-center gap-2 text-lg md:flex">
              <h1 className="font-bold">{account.username}</h1>
              <h1 className="font-bold">|</h1>
              <h1 className="font-bold">{account.role}</h1>
            </div>

            <Avatar name={account.username} className="h-9 w-9" />
          </>
        )}
      </div>
    </div>
  );
}
