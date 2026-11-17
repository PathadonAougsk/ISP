import type { Announcement } from "@/lib/announcement";
import AnnouncementCard from "@/components/announcement/AnnouncementCard";
import { ListMessage, LoadMoreButton } from "@/components/ui/table";

export default function AnnouncementList({
  announcements,
  selectedId,
  getAuthorName,
  onSelect,
  hasMore = false,
  loadingMore = false,
  loadMoreError = false,
  onLoadMore,
  emptyMessage = "No announcements yet.",
}: {
  announcements: Announcement[];
  selectedId: number | null;
  getAuthorName: (id: string) => string;
  onSelect: (id: number) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMoreError?: boolean;
  onLoadMore: () => void;
  emptyMessage?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* scrollable announcement list */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden rounded-t-[15px] scrollbar-none max-[900px]:flex max-[900px]:gap-3 max-[900px]:space-y-0 max-[900px]:overflow-x-auto max-[900px]:overflow-y-hidden">
        {announcements.length === 0 ? (
          <div className="max-[900px]:w-80 max-[900px]:shrink-0">
            <ListMessage>{emptyMessage}</ListMessage>
          </div>
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

        {loadMoreError && (
          <div className="max-[900px]:w-80 max-[900px]:shrink-0">
            <ListMessage>Failed to load more announcement</ListMessage>
          </div>
        )}

        {hasMore && (
          <div className="max-[900px]:flex max-[900px]:shrink-0 max-[900px]:items-center max-[900px]:justify-start">
            <LoadMoreButton disabled={loadingMore} onClick={onLoadMore} />
          </div>
        )}
        <div className="h-50 shrink-0 max-[900px]:hidden"></div>
      </div>
    </div>
  );
}
