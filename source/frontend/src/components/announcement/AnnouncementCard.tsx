import { useEffect, useRef, useState } from "react";
import type { Announcement } from "@/lib/announcement";
import { formatFullDateTime } from "@/lib/format";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";

export default function AnnouncementCard({
  announcement,
  authorName,
  selected,
  onSelect,
}: {
  announcement: Announcement;
  authorName: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const metadataRef = useRef<HTMLDivElement>(null);
  const [wrapped, setWrapped] = useState(false);

  useEffect(() => {
    const element = metadataRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const items = element.children;
      if (items.length < 2) {
        return;
      }

      setWrapped(
        items[0].getBoundingClientRect().top !==
          items[1].getBoundingClientRect().top,
      );
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex ${wrapped ? "h-48" : "h-45"} w-full flex-col gap-1 rounded-[15px] bg-white p-4 text-left ${
        selected ? "ring-2 ring-inset ring-(--primary-color-2)" : ""
      }`}
    >
      <h1 className="text-2xl font-bold text-black line-clamp-2">
        {renderWithLinks(announcement.name)}
      </h1>

      <div
        ref={metadataRef}
        className="flex flex-wrap items-center gap-x-12 text-sm text-gray-600"
      >
        <span className="flex items-center gap-2">
          <Icon src="/clock.svg" alt="" className="h-4 w-auto shrink-0" />
          {formatFullDateTime(announcement.created)}
        </span>

        <span className="flex items-center gap-2">
          <Icon src="/account.svg" alt="" className="h-4 w-auto shrink-0" />
          {authorName}
        </span>
      </div>

      <div className="line-clamp-2 text-base font-normal text-gray-700 whitespace-pre-line">
        {announcement.description
          ? renderWithLinks(announcement.description)
          : "No description"}
      </div>
    </button>
  );
}
