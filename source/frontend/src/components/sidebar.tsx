"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNavigation = ["dashboard", "request-table", "report"];
const bottomNavigation = ["announcement", "setting"];

function NavigationItem({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <Link href={`/${name}`} className={`flex h-15 w-full select-none items-center justify-center ${active ? "bg-(--primary-color-1) hover:bg-(--primary-color-1-hover)" : "hover:bg-(--primary-color-2-hover)"}`}>
      <Image src={`./${name}.svg`} width={0} height={0} sizes="auto" className="h-auto w-5" alt={name} draggable={false} />
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const currentPath = pathname.split("/")[1];

  return (
    <div className="sticky top-0 left-0 flex h-screen w-15 shrink-0 flex-col justify-between bg-(--primary-color-2)">
      <div className="flex h-fit w-full flex-col items-center justify-evenly">
        <div className="flex h-15 w-full select-none items-center justify-center hover:bg-(--primary-color-2-hover)">
          <Image src="./sidebar.svg" width={0} height={0} sizes="auto" className="h-auto w-5" alt="Sidebar" draggable={false} />
        </div>
        {mainNavigation.map((name) => <NavigationItem key={name} name={name} active={currentPath === name} />)}
      </div>

      <div className="flex h-fit w-full flex-col items-center justify-evenly select-none">
        {bottomNavigation.map((name) => <NavigationItem key={name} name={name} />)}
      </div>
    </div>
  );
}
