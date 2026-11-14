"use client";

import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import { cached, withoutPagination } from "@/lib/cache/cache";
import { buildQuery } from "@/lib/query";

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

export type GetAnnouncementsParams = {
  limit?: number;
  offset?: number;
};

export async function fetchAnnouncements(
  params: GetAnnouncementsParams = {},
): Promise<Announcement[]> {
  const qs = buildQuery(params).toString();
  const res = await apiFetch(`/announcement/${qs ? `?${qs}` : ""}`);
  await apiOrThrow(res, "Could not load announcements.");

  const { Announcements } = (await res.json()) as AnnouncementsResponse;

  // newest first
  return [...Announcements].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );
}

const ANNOUNCEMENTS_CACHE_TTL = 5 * 60 * 1000;

// same filters share expiration, different limits share the same family
export const getAnnouncements = cached(
  fetchAnnouncements,
  ANNOUNCEMENTS_CACHE_TTL,
  "announcements",
  withoutPagination,
  (result, limit) => result.slice(0, limit),
);

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<void> {
  const res = await apiSendJson("/announcement/", "POST", input);
  await apiOrThrow(res, "Could not create the announcement.");

  // data changed, so drop cached lists
  getAnnouncements.clear();
}

export async function updateAnnouncement(
  id: number,
  input: CreateAnnouncementInput,
): Promise<void> {
  const res = await apiSendJson(`/announcement/${id}`, "PUT", input);
  await apiOrThrow(res, "Could not update the announcement.");

  getAnnouncements.clear();
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const res = await apiFetch(`/announcement/${id}`, { method: "DELETE" });
  await apiOrThrow(res, "Could not delete the announcement.");

  getAnnouncements.clear();
}
