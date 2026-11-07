import Icon from "@/components/icon";
import type { Announcement } from "@/lib/announcement";
import { formatFullDateTime } from "@/lib/format";

export default function AnnouncementDetail({
  announcement,
  authorName,
}: {
  announcement: Announcement | null;
  authorName: string;
}) {
  if (!announcement) {
    return (
      <div className="flex h-full items-center justify-center rounded-t-[30px] bg-gray-200 text-sm text-gray-500">
        Select an announcement to read it.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto rounded-t-[30px] bg-(--panel-bg) p-6">
      <h2 className="text-2xl font-bold wrap-break-word">
        {announcement.name}
      </h2>

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
        <span className="flex items-center gap-2">
          <Icon src="/clock.svg" className="h-auto w-4 shrink-0" />
          {formatFullDateTime(announcement.created)}
        </span>
      </div>

      {/* TODO: make links clickable */}
      <p className="text-sm whitespace-pre-wrap wrap-break-word text-gray-700">
        {announcement.description}
      </p>
    </div>
  );
}
