import type { Announcement } from "@/lib/announcement";
import AnnouncementCard from "./AnnouncementCard";

export default function AnnouncementList({
  announcements,
  selectedId,
  getAuthorName,
  onSelect,
}: {
  announcements: Announcement[];
  selectedId: number | null;
  getAuthorName: (id: string) => string;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* scrollable announcement list */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden rounded-t-[15px] scrollbar-none">
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
