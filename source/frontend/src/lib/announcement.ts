import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";

export type Announcement = {
  id: number;
  name: string;
  description: string | null;
  created_by: string;
  created: string;
  updated: string;
};

export type AnnouncementsResponse = {
  Announcements: Announcement[];
};

export type CreateAnnouncementInput = {
  name: string;
  description: string;
};

export async function getAnnouncements(): Promise<Announcement[]> {
  const res = await apiFetch("/announcement/");
  await apiOrThrow(res, "Could not load announcements.");

  const { Announcements } = (await res.json()) as AnnouncementsResponse;

  // newest first
  return [...Announcements].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );
}

// TODO: backend POST is still a stub, wont save until its done
export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<void> {
  const res = await apiSendJson("/announcement/", "POST", input);
  await apiOrThrow(res, "Could not create the announcement.");
}

// TODO: getAnnouncement(id) -> GET /announcement/{id}
// TODO: updateAnnouncement(id, patch) -> PUT /announcement/{id}
// TODO: deleteAnnouncement(id) -> DELETE /announcement/{id}
