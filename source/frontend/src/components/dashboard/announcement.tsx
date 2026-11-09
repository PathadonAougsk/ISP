"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";
import { formatFullDateTime } from "@/lib/format";
import {
  getAnnouncements,
  type Announcement as AnnouncementItem,
} from "@/lib/announcement";

export default function Announcement({
  usernames,
}: {
  usernames: Record<string, string>;
}) {
  const [item, setItem] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // newest one only
  useEffect(() => {
    let cancelled = false;

    getAnnouncements({ limit: 1 })
      .then((announcements) => {
        if (!cancelled) setItem(announcements[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || error || !item) {
    return null;
  }

  return (
    <div className="w-full shrink-0 overflow-hidden rounded-[30px] bg-(--panel-bg)">
      <div className="flex h-full flex-col p-5 pb-0">
        <h1 className="text-2xl font-bold text-black whitespace-pre-line line-clamp-2">
          {renderWithLinks(item.name)}
        </h1>

        <div className="mt-2 flex items-center gap-12 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Icon src="/clock.svg" alt="" className="h-4 w-auto" />
            <span>{formatFullDateTime(item.created)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon src="/user.svg" alt="" className="h-4 w-auto" />
            <span>{usernames[item.created_by] ?? "-"}</span>
          </div>
        </div>

        <div className="mt-2 mb-3 min-h-0 flex-1 overflow-hidden text-base font-normal text-gray-700">
          <div className="line-clamp-4 whitespace-pre-line wrap-anywhere">
            {renderWithLinks(item.description ?? "")}
          </div>
        </div>

        <div className="-mx-5 mt-auto">
          <Link
            href="/announcement"
            className="group block rounded-b-[30px] bg-(--primary-color-3) px-5 py-3 text-center hover:bg-(--primary-color-3-hover)"
          >
            <span className="text-base font-semibold text-black underline group-hover:text-gray-800">
              Read more
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
