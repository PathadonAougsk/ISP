"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, type Account } from "@/lib/account";

export default function Topbar() {
  const pathname = usePathname().replace("/", "");
  const [account, setAccount] = useState<Account | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setAccount)
      .catch(() => setAccount(undefined))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="sticky top-0 z-10 flex h-15 w-full flex-row items-center justify-between bg-(--primary-color-3) p-7.5">
      <h1
        className="cursor-pointer text-3xl font-bold"
        onClick={() => window.location.reload()}
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

            <Image src="./profile.svg" width={36} height={36} alt="Profile" />
          </>
        )}
      </div>
    </div>
  );
}
