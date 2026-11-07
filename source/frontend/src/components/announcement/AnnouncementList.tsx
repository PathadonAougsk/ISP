import type { Announcement } from "@/lib/announcement";
import AnnouncementCard from "@/components/announcement/AnnouncementCard";
import { ListMessage } from "@/components/dashboard/dashboard-utils";

export default function AnnouncementList({
  announcements,
  selectedId,
  getAuthorName,
  onSelect,
  emptyMessage = "No announcements yet.",
}: {
  announcements: Announcement[];
  selectedId: number | null;
  getAuthorName: (id: string) => string;
  onSelect: (id: number) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* scrollable announcement list */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden rounded-t-[15px] scrollbar-none">
        {announcements.length === 0 ? (
          <ListMessage>{emptyMessage}</ListMessage>
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
