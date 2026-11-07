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

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading...</p>;
  }

  if (error) {
    return <p className="p-6 text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="flex h-full w-full flex-1 gap-5 px-5 pt-5">
      <div className="w-2/5 shrink-0 overflow-y-auto">
        <AnnouncementList
          announcements={announcements}
          selectedId={selected?.id ?? null}
          getAuthorName={getAuthorName}
          onSelect={setSelectedId}
          canCreate={isAdmin}
          onCreate={() => setCreating(true)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <AnnouncementDetail
          announcement={selected}
          authorName={selected ? getAuthorName(selected.created_by) : ""}
        />
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
