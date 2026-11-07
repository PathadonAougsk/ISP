import type { Announcement } from "@/lib/announcement";
import AnnouncementCard from "./AnnouncementCard";

export default function AnnouncementList({
  announcements,
  selectedId,
  getAuthorName,
  onSelect,
  canCreate,
  onCreate,
}: {
  announcements: Announcement[];
  selectedId: number | null;
  getAuthorName: (id: string) => string;
  onSelect: (id: number) => void;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-4 pb-5">
      {/* only admin / owner can create */}
      {canCreate && (
        <div className="flex shrink-0 items-center gap-3 pl-3">
          <span className="text-lg font-semibold">Create new announcement</span>
          <button
            type="button"
            onClick={onCreate}
            aria-label="Create new announcement"
            className="flex items-center justify-center text-2xl font-semibold w-9 h-9 rounded-full bg-(--primary-color-2) text-white hover:bg-(--primary-color-2-hover)"
          >
            +
          </button>
        </div>
      )}

      {/* scrollable announcement list */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden rounded-[30px] scrollbar-thin">
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        ) : (
          announcements.map((item) => (
            <AnnouncementCard
              key={item.id}
              announcement={item}
              authorName={getAuthorName(item.created_by)}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
