"use client"
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation"

export default function Topbar() {
  const pathname = usePathname().replace("/", "");
  return (
    <div className="w-full h-15 flex flex-row bg-[#C4DFAA] sticky top-0 z-10 items-center justify-between p-3">
      <h1 className="font-semibold text-3xl">{pathname[0].toUpperCase() + pathname.slice(1)}</h1>
      <div className="flex flex-row gap-2 text-center items-center justify-center">
        <Image src={"./profile.svg"} width={40} height={40} alt="Profile"></Image>
        <div className="hidden md:flex flex-row gap-2 items-center">
          <h1 className="font-semibold">Pasin Mclearn</h1>
          <h1 className="font-semibold">|</h1>
          <h1 className="font-semibold">Lab Member</h1>
        </div>
      </div>
    </div>
  )
}
