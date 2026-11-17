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

// Fetch announcements without updating React state
async function fetchList(limit: number): Promise<List> {
  const rows = await getAnnouncements({ limit: limit + 1 });

  return {
    items: rows.slice(0, limit),
    limit,
    hasMore: rows.length > limit,
  };
}

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

  // One fetch for the first load, a reload and Load More alike.
  // One extra row is asked for, to see whether there is more.
  const load = useCallback(async (limit: number) => {
    setFetching(true);

    try {
      const result = await fetchList(limit);

      setList(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setFetching(false);
      setLoaded(true);
    }
  }, []);

  // Initial load: update state only after the request completes.
  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const result = await fetchList(PAGE_SIZE);

        if (cancelled) return;

        setList(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) {
          setFetching(false);
          setLoaded(true);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  // after a write, refetch the same stretch of the list
  const reload = useCallback(() => {
    return load(list.limit);
  }, [load, list.limit]);

  const loadMore = useCallback(() => {
    if (fetching) return;

    void load(list.limit + PAGE_SIZE);
  }, [fetching, list.limit, load]);

  // nothing on screen yet, so the error takes over the whole panel
  const blank = error !== null && list.items.length === 0;

  // first one selected by default. id from link not in list = not found
  const selected =
    selectedId === null
      ? (list.items[0] ?? null)
      : (list.items.find((item) => item.id === selectedId) ?? null);
  const notFound = loaded && !blank && selectedId !== null && !selected;

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
            icon="/plus.svg"
            iconColor="white"
            aria-label="Create new announcement"
            onClick={() => setCreating(true)}
          />
        </div>
      )}

      {/* green panel hold list + detail */}
      <div className="flex min-h-0 flex-1 gap-3 rounded-t-[30px] bg-(--panel-bg) px-4 pt-4 max-[900px]:flex-col">
        <div className="w-2/5 shrink-0 overflow-y-auto max-[900px]:w-full max-[900px]:overflow-visible">
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

        <div className="min-h-0 min-w-0 flex-1">
          <AnnouncementDetail
            announcement={selected}
            authorName={selected ? authorName(selected.created_by) : ""}
            emptyMessage={notFound ? "Announcement not found." : undefined}
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
