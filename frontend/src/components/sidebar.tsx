"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname().replace("/", "");
  const icons = ["dashboard", "request-table", "report"];
  const router = useRouter();

  return (
    <div className="sticky top-0 left-0 flex h-screen w-15 shrink-0 flex-col justify-between bg-(--primary-color-2)">
      <div className="flex h-fit w-full flex-col items-center justify-evenly">
        <div className="flex h-15 w-full select-none items-center justify-center hover:bg-(--primary-color-2-hover)">
          <Image src="./sidebar.svg" width={20} height={20} alt="Sidebar" draggable={false} /></div>

        {icons.map((urlName) =>
          pathname === urlName ? (
            <div key={urlName} className="flex h-15 w-full select-none items-center justify-center bg-(--primary-color-1)">
              <Image src={`./${urlName}.svg`} width={20} height={20} alt={urlName} draggable={false} /></div>
          ) : (
            <div key={urlName} className="flex h-15 w-full select-none items-center justify-center hover:bg-(--primary-color-2-hover)" onClick={() => router.replace(`/${urlName}`)}>
              <Image src={`./${urlName}.svg`} width={20} height={20} alt={urlName} draggable={false} /></div>
          )
        )}
      </div>

      <div className="flex h-fit w-full flex-col items-center justify-evenly select-none">
        <div className="flex h-15 w-full items-center justify-center hover:bg-(--primary-color-2-hover)">
          <Image src="./announcement.svg" width={20} height={20} alt="Announcement" draggable={false} /></div>
        <div className="flex h-15 w-full items-center justify-center hover:bg-(--primary-color-2-hover)">
          <Image src="./setting.svg" width={20} height={20} alt="Setting" draggable={false} /></div>
      </div>
    </div>
  );
}
