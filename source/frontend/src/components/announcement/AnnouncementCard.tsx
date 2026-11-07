import Icon from "@/components/icon";
import type { Announcement } from "@/lib/announcement";
import { formatFullDateTime } from "@/lib/format";

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
      className={`flex w-full flex-col gap-3 rounded-3xl p-5 text-left ${selected ? "bg-gray-300" : "bg-gray-200 hover:bg-gray-300"}`}
    >
      <h2 className="text-2xl font-bold break-words">{announcement.name}</h2>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-600">
        {/* TODO: lab not in model yet, placeholder only */}
        <span className="flex items-center gap-2">
          <Icon src="/file.svg" className="h-auto w-4 shrink-0" />
          Lab TBD
        </span>
        <span className="flex items-center gap-2">
          <Icon src="/user.svg" className="h-auto w-4 shrink-0" />
          {authorName}
        </span>
      </div>

      <span className="flex items-center gap-2 text-xs text-gray-600">
        <Icon src="/clock.svg" className="h-auto w-4 shrink-0" />
        {formatFullDateTime(announcement.created)}
      </span>
    </button>
  );
}
