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
    <div className="flex flex-col gap-4">
      {/* only admin / owner can create */}
      {canCreate && (
        <div className="flex items-center gap-3">
          <span className="text-base font-bold">Create new announcement</span>
          <button
            type="button"
            onClick={onCreate}
            aria-label="Create new announcement"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-600 text-2xl text-white hover:bg-gray-700"
          >
            +
          </button>
        </div>
      )}

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
  );
}
