"use client";

import Link from "next/link";
import Icon from "@/components/icon";
import { renderWithLinks } from "@/components/dashboard/dashboard_utils";

export default function Announcement() {
  const description =
    "All classes today are canceled due to an unexpected situation. Students should stay home and use the time for rest or personal activities.\n\ngoogle.com and www.google.com\n\nhttps://youtu.be/dQw4w9WgXcQ";

  return (
    <div className="min-h-25 max-h-75 w-full overflow-hidden rounded-[30px] bg-(--panel-bg)">
      <div className="flex h-full flex-col p-5 pb-0">
        <h1 className="text-3xl font-bold text-black line-clamp-2">
          Test Topic Announcement 001 and show Line wrapping Test Topic
          Announcement 001 and show Line wrapping
        </h1>

        <div className="mt-2 flex items-center gap-12 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Icon src="/user.svg" alt="" className="h-4 w-auto" />
            <span>Pasin Mclaren</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon src="/clock.svg" alt="" className="h-4 w-auto" />
            <span>Friday 28 August 2026, 09:47</span>
          </div>
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-hidden text-base font-normal text-gray-700 whitespace-pre-line">
          {renderWithLinks(description)}
        </div>

        <div className="-mx-5 mt-auto">
          <Link
            href="/announcement"
            className="group block rounded-b-[30px] bg-(--primary-color-3) px-5 py-3 text-center hover:bg-(--primary-color-3-hover)"
          >
            <span className="text-base font-semibold text-black underline group-hover:text-gray-800">
              Readmore
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
