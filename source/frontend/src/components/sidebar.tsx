"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSettings } from "./setting-provider";

const mainNavigation = ["dashboard", "request-table", "report"];
const bottomNavigation = ["announcement"];

function getItemClass(active = false) {
  const color = active ? "bg-(--primary-color-1) hover:bg-(--primary-color-1-hover)" : "hover:bg-(--primary-color-2-hover)";
  return `flex h-15 w-full shrink-0 select-none items-center justify-start gap-5 px-5 ${color}`;
}

function NavigationIcon({ name }: { name: string }) {
  return <Image src={`./${name}.svg`} width={0} height={0} sizes="auto" className="h-auto w-5 shrink-0" alt={name} draggable={false} />;
}

function NavigationLabel({ children }: { children: string }) {
  return <h1 className="sidebar-name-visible whitespace-nowrap text-base font-medium capitalize">{children}</h1>;
}

function NavigationItem({ name, active = false, expanded = false, onClick }: { name: string; active?: boolean; expanded?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={`/${name}`}
      onClick={(event) => {
        if (active) event.preventDefault();
        onClick?.();
      }}
      className={getItemClass(active)}
    >
      <NavigationIcon name={name} />
      {expanded && <NavigationLabel>{name}</NavigationLabel>}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const currentPath = pathname.split("/")[1];
  const { openSettings } = useSettings();
  const [expanded, setExpanded] = useState(false);

  // Active tab: reverse the state. Other tab: go to that page and collapse.
  const handleNavigationClick = (name: string) => setExpanded(currentPath === name ? !expanded : false);

  return (
    <div className="sticky top-0 left-0 z-50 flex h-screen w-15 shrink-0 flex-col justify-between bg-(--primary-color-2)">
      {expanded && (
        <div
          className="popup-overlay fixed inset-0 z-40 bg-black"
          onClick={() => setExpanded(false)}
        />
      )}

      <div className={`absolute top-0 left-0 flex h-screen flex-col justify-between bg-(--primary-color-2) ${expanded ? "z-50 w-56 sidebar-expand" : "w-15 sidebar-collapse"}`}>
        <div className="flex h-fit w-full flex-col items-center justify-evenly">
          <button type="button" onClick={() => setExpanded(!expanded)} className={getItemClass()}>
            <NavigationIcon name="sidebar" />
          </button>

          {mainNavigation.map((name) => (
            <NavigationItem key={name} name={name} active={currentPath === name} expanded={expanded} onClick={() => handleNavigationClick(name)} />
          ))}
        </div>

        <div className="flex h-fit w-full flex-col items-center select-none">
          {bottomNavigation.map((name) => (
            <NavigationItem key={name} name={name} active={currentPath === name} expanded={expanded} onClick={() => handleNavigationClick(name)} />
          ))}

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              openSettings();
            }}
            className={getItemClass()}
          >
            <NavigationIcon name="setting" />
            {expanded && <NavigationLabel>Settings</NavigationLabel>}
          </button>
        </div>
      </div>
    </div>
  );
}
