"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AnnouncementDetail from "@/components/announcement/AnnouncementDetail";
import AnnouncementList from "@/components/announcement/AnnouncementList";
import CreateAnnouncementModal from "@/components/announcement/CreateAnnouncementModal";
import DeleteAnnouncementModal from "@/components/announcement/DeleteAnnouncementModal";
import { useCurrentAccount, useMembers } from "@/lib/account";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  type Announcement,
  type CreateAnnouncementInput,
} from "@/lib/announcement";

const PAGE_SIZE = 10;
const INCREMENT = 10;

export default function Annoucment() {
  const { isAdmin } = useCurrentAccount();
  const { members } = useMembers();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const limitRef = useRef(PAGE_SIZE);
  const loadedRef = useRef(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setFetching(true);

      try {
        // fetch 1 extra to check overflow
        const rows = await getAnnouncements({
          limit: limitRef.current + 1,
        });

        if (cancelled) return;

        setAnnouncements(rows.slice(0, limitRef.current));
        setHasMore(rows.length > limitRef.current);
        setError(null);
        setLoadMoreError(false);
        loadedRef.current = true;
      } catch (err) {
        if (cancelled) return;

        if (loadedRef.current) {
          setLoadMoreError(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
          setLoaded(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;

    loadingMoreRef.current = true;
    setFetching(true);

    const nextLimit = limit + INCREMENT;

    try {
      const rows = await getAnnouncements({
        limit: nextLimit + 1,
      });

      setAnnouncements(rows.slice(0, nextLimit));
      setHasMore(rows.length > nextLimit);

      // only commit limit after successful request
      limitRef.current = nextLimit;
      setLimit(nextLimit);

      setLoadMoreError(false);
    } catch {
      // keep previous limit and announcements
      setLoadMoreError(true);
    } finally {
      loadingMoreRef.current = false;
      setFetching(false);
    }
  }, [hasMore, limit]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // first one selected by default
  const selected =
    announcements.find((item) => item.id === selectedId) ??
    announcements[0] ??
    null;

  const getAuthorName = (id: string) =>
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
    reload();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-white px-5 pt-5 text-gray-900">
      {/* only admin / owner can create */}
      {loaded && !error && isAdmin && (
        <div className="flex shrink-0 items-center gap-3 pl-3">
          <span className="text-lg font-semibold">Create new announcement</span>
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="Create new announcement"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--primary-color-2) text-2xl font-semibold text-white hover:bg-(--primary-color-2-hover)"
          >
            +
          </button>
        </div>
      )}

      {/* green panel hold list + detail */}
      <div className="flex min-h-0 flex-1 gap-3 rounded-t-[30px] bg-(--panel-bg) px-4 pt-4">
        <div className="w-2/5 shrink-0 overflow-y-auto">
          <AnnouncementList
            announcements={!loaded || error ? [] : announcements}
            selectedId={selected?.id ?? null}
            getAuthorName={getAuthorName}
            onSelect={setSelectedId}
            hasMore={hasMore}
            loadingMore={loaded && fetching}
            loadMoreError={loadMoreError}
            onLoadMore={loadMore}
            emptyMessage={
              !loaded
                ? "Loading announcements..."
                : error
                  ? "Failed to load announcements"
                  : "No announcements yet."
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <AnnouncementDetail
            announcement={!loaded || error ? null : selected}
            authorName={selected ? getAuthorName(selected.created_by) : ""}
            canEdit={isAdmin}
            canDelete={isAdmin}
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
          authorName={getAuthorName(selected.created_by)}
          onClose={() => setDeleting(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
