import { createClient } from "@/lib/supabase/client";

// Trailing slashes are stripped so a base of "http://localhost:8000/" and
// "http://localhost:8000" behave the same: everyone's source/.env differs.
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const url = `${API_URL}/${path.replace(/^\/+/, "")}`;

  return fetch(url, { ...init, headers });
}
