import Icon from "@/components/icon";
import type { Announcement } from "@/lib/announcement";
import { formatFullDateTime } from "@/lib/format";
import {
  renderWithLinks,
  SlideupDescription,
} from "@/components/dashboard/dashboard-utils";

export default function AnnouncementDetail({
  announcement,
  authorName,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}: {
  announcement: Announcement | null;
  authorName: string;
  canEdit?: boolean;
  canDelete?: boolean;
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
          <Icon src="/user.svg" className="h-auto w-4 shrink-0" />
          {authorName}
        </span>

        <span className="flex items-center gap-2">
          <Icon src="/clock.svg" className="h-auto w-4 shrink-0" />
          {formatFullDateTime(announcement.created)}
        </span>

        {(canEdit || canDelete) && (
          <div className="ml-auto flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex h-6 w-15 cursor-pointer items-center justify-center rounded-full bg-(--primary-color-2) px-4 text-sm font-semibold text-white hover:bg-(--primary-color-2-hover)"
              >
                Edit
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex h-6 w-15 cursor-pointer items-center justify-center rounded-full bg-(--primary-red) px-4 text-sm font-semibold text-white hover:bg-(--primary-red-hover)"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <SlideupDescription description={announcement.description} />
    </div>
  );
}
