"use client";

import { useCallback, useEffect, useState } from "react";
import AnnouncementDetail from "@/components/announcement/AnnouncementDetail";
import AnnouncementList from "@/components/announcement/AnnouncementList";
import CreateAnnouncementModal from "@/components/announcement/CreateAnnouncementModal";
import { useCurrentAccount, useMembers } from "@/lib/account";
import {
  createAnnouncement,
  getAnnouncements,
  type Announcement,
  type CreateAnnouncementInput,
} from "@/lib/announcement";

export default function Annoucment() {
  const { isAdmin } = useCurrentAccount();
  const { members } = useMembers();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setAnnouncements(await getAnnouncements());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // first one selected by default
  const selected =
    announcements.find((item) => item.id === selectedId) ??
    announcements[0] ??
    null;

  const getAuthorName = (id: string) =>
    members.find((member) => member.id === id)?.name ?? "Unknown";

  const handleCreate = async (input: CreateAnnouncementInput) => {
    await createAnnouncement(input);
    await load();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-white px-5 pt-5 text-gray-900">
      {/* only admin / owner can create */}
      {!loading && !error && isAdmin && (
        <div className="flex shrink-0 items-center gap-3 pl-3">
          <span className="text-lg font-semibold">Create new announcement</span>
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="Create new announcement"
            className="flex items-center justify-center text-2xl font-semibold w-9 h-9 rounded-full bg-(--primary-color-2) text-white hover:bg-(--primary-color-2-hover)"
          >
            +
          </button>
        </div>
      )}

      {/* green panel hold list + detail */}
      <div className="flex min-h-0 flex-1 gap-3 rounded-t-[30px] bg-(--panel-bg) pt-4 px-4">
        <div className="w-2/5 shrink-0 overflow-y-auto">
          <AnnouncementList
            announcements={loading || error ? [] : announcements}
            selectedId={selected?.id ?? null}
            getAuthorName={getAuthorName}
            onSelect={setSelectedId}
            emptyMessage={
              loading
                ? "Loading announcements..."
                : error
                  ? "Failed to load announcements"
                  : "No announcements yet."
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <AnnouncementDetail
            announcement={loading || error ? null : selected}
            authorName={selected ? getAuthorName(selected.created_by) : ""}
          />
        </div>
      </div>

      {creating && (
        <CreateAnnouncementModal
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
