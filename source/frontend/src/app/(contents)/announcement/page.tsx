"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AnnouncementDetail from "@/components/announcement/AnnouncementDetail";
import AnnouncementList from "@/components/announcement/AnnouncementList";
import CreateAnnouncementModal from "@/components/announcement/CreateAnnouncementModal";
import DeleteAnnouncementModal from "@/components/announcement/DeleteAnnouncementModal";
import Button from "@/components/ui/button";
import { useCurrentAccount, useMembers } from "@/lib/account";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  type Announcement,
  type CreateAnnouncementInput,
} from "@/lib/announcement";

// how many are listed at first, and how many more each Load More adds
const PAGE_SIZE = 10;

type List = {
  items: Announcement[];
  limit: number;
  hasMore: boolean;
};

export default function AnnouncementPage() {
  const { isAdmin } = useCurrentAccount();
  const { members } = useMembers();

  const [list, setList] = useState<List>({
    items: [],
    limit: PAGE_SIZE,
    hasMore: false,
  });
  const [fetching, setFetching] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // opened by /announcement/id link, else null
  const idParam = Number(useParams<{ id?: string }>().id);
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isInteger(idParam) ? idParam : null,
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // One fetch for the first load, a reload and Load More alike. One extra row
  // is asked for, to see whether there is more. The limit is only committed
  // once the request lands, so a failed Load More keeps the list it had.
  const load = useCallback(async (limit: number) => {
    setFetching(true);

    try {
      const rows = await getAnnouncements({ limit: limit + 1 });

      setList({
        items: rows.slice(0, limit),
        limit,
        hasMore: rows.length > limit,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setFetching(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load(PAGE_SIZE);
  }, [load]);

  // after a write, refetch the same stretch of the list
  const reload = useCallback(() => load(list.limit), [load, list.limit]);

  const loadMore = useCallback(() => {
    if (!fetching) void load(list.limit + PAGE_SIZE);
  }, [fetching, list.limit, load]);

  // opened by link: load more til id found
  useEffect(() => {
    if (selectedId === null || fetching || error !== null || !list.hasMore) {
      return;
    }
    if (list.items.some((item) => item.id === selectedId)) return;

    void load(list.limit + PAGE_SIZE);
  }, [selectedId, fetching, error, list, load]);

  // nothing on screen yet, so the error takes over the whole panel
  const blank = error !== null && list.items.length === 0;

  // first one selected by default
  const selected =
    list.items.find((item) => item.id === selectedId) ?? list.items[0] ?? null;

  // clear [id] from url when other one picked
  const handleSelect = (id: number) => {
    setSelectedId(id);
    window.history.replaceState(null, "", "/announcement");
  };

  const authorName = (id: string) =>
    members.find((member) => member.id === id)?.name ?? "Unknown";

  const handleCreate = async (input: CreateAnnouncementInput) => {
    await createAnnouncement(input);
    reload();
  };

  const handleEdit = async (input: CreateAnnouncementInput) => {
    if (!selected) return;
    await updateAnnouncement(selected.id, input);
    reload();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteAnnouncement(selected.id);
    setSelectedId(null);
    reload();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-white px-5 pt-5 text-gray-900">
      {/* only admin / owner can create */}
      {loaded && !blank && isAdmin && (
        <div className="flex shrink-0 items-center gap-3 pl-3">
          <span className="text-lg font-semibold">Create new announcement</span>
          <Button
            variant="green"
            size="circle"
            onClick={() => setCreating(true)}
            aria-label="Create new announcement"
            className="font-semibold"
          >
            +
          </Button>
        </div>
      )}

      {/* green panel hold list + detail */}
      <div className="flex min-h-0 flex-1 gap-3 rounded-t-[30px] bg-(--panel-bg) px-4 pt-4">
        <div className="w-2/5 shrink-0 overflow-y-auto">
          <AnnouncementList
            announcements={list.items}
            selectedId={selected?.id ?? null}
            getAuthorName={authorName}
            onSelect={handleSelect}
            hasMore={list.hasMore}
            loadingMore={fetching}
            loadMoreError={error !== null && list.items.length > 0}
            onLoadMore={loadMore}
            emptyMessage={
              !loaded
                ? "Loading announcements..."
                : blank
                  ? "Failed to load announcements"
                  : "No announcements yet."
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <AnnouncementDetail
            announcement={selected}
            authorName={selected ? authorName(selected.created_by) : ""}
            canManage={isAdmin}
            onEdit={() => setEditing(true)}
            onDelete={() => setDeleting(true)}
          />
        </div>
      </div>

      {creating && (
        <CreateAnnouncementModal
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && selected && (
        <CreateAnnouncementModal
          announcement={selected}
          onClose={() => setEditing(false)}
          onSubmit={handleEdit}
        />
      )}

      {deleting && selected && (
        <DeleteAnnouncementModal
          announcement={selected}
          authorName={authorName(selected.created_by)}
          onClose={() => setDeleting(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
