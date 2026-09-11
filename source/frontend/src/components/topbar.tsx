"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Topbar() {
  const pathname = usePathname().replace("/", "");

  return (
    <div className="sticky top-0 z-10 flex h-15 w-full flex-row items-center justify-between bg-(--primary-color-3) p-7.5">
      <h1 className="text-3xl font-bold">{pathname[0].toUpperCase() + pathname.slice(1)}</h1>

      <div className="flex flex-row items-center justify-center gap-5 text-center">
        <Image src="./profile.svg" width={36} height={36} alt="Profile" />
        <div className="hidden flex-row items-center gap-2 text-lg md:flex">
          <h1 className="font-bold">Pasin Mclearn</h1>
          <h1 className="font-bold">|</h1>
          <h1 className="font-bold">Lab Member</h1>
        </div>
      </div>
    </div>
  );
}
