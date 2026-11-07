import Icon from "@/components/icon";
import type { Announcement } from "@/lib/announcement";
import { formatFullDateTime } from "@/lib/format";
import { renderWithLinks } from "@/components/dashboard/dashboard-utils";

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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex h-45 w-full flex-col gap-1 rounded-[15px] bg-white p-4 text-left ${
        selected ? "ring-2 ring-inset ring-(--primary-color-2)" : ""
      }`}
    >
      <h1 className="text-2xl font-bold text-black text-justify line-clamp-2">
        {renderWithLinks(announcement.name)}
      </h1>

      <div className="flex flex-wrap items-center gap-12 text-sm text-gray-600">
        <span className="flex items-center gap-2">
          <Icon src="/clock.svg" alt="" className="h-4 w-auto shrink-0" />
          {formatFullDateTime(announcement.created)}
        </span>

        <span className="flex items-center gap-2">
          <Icon src="/user.svg" alt="" className="h-4 w-auto shrink-0" />
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
