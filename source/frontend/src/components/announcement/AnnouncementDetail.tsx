import type { Announcement } from "@/lib/announcement";
import { formatFullDateTime } from "@/lib/format";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { renderWithLinks } from "@/components/ui/linkify";
import { SlideupDescription } from "@/components/dashboard/dashboard-utils";

export default function AnnouncementDetail({
  announcement,
  authorName,
  canManage = false,
  onEdit,
  onDelete,
}: {
  announcement: Announcement | null;
  authorName: string;
  canManage?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!announcement) {
    return (
      <div className="flex h-full items-center justify-center rounded-t-[15px] bg-white text-base font-medium text-gray-400">
        Select an announcement to read it.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-t-[15px] bg-white p-4">
      <h2 className="text-2xl font-bold wrap-break-word">
        {renderWithLinks(announcement.name)}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600">
        <span className="flex items-center gap-2">
          <Icon src="/account.svg" className="h-auto w-4 shrink-0" />
          {authorName}
        </span>

        <span className="flex items-center gap-2">
          <Icon src="/clock.svg" className="h-auto w-4 shrink-0" />
          {formatFullDateTime(announcement.created)}
        </span>

        {canManage && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline-white"
              size="sm"
              onClick={onEdit}
              className="w-15 font-semibold"
            >
              Edit
            </Button>

            <Button
              variant="outline-white"
              size="sm"
              onClick={onDelete}
              className="w-15 font-semibold"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <SlideupDescription description={announcement.description} />
    </div>
  );
}
