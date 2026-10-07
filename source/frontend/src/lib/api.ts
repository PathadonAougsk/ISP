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

export function apiSendJson(
  path: string,
  method: "POST" | "PUT",
  body: object,
): Promise<Response> {
  return apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// FastAPI puts the useful message in `detail`, and the member rules lean on it
// ("A Lab Owner cannot be deactivated"), so surface that rather than the status.
export async function apiDetail(res: Response, fallback: string) {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // no JSON body, fall through to the fallback
  }
  return fallback;
}

// Throws with the server's `detail` so callers can show it as is.
export async function apiOrThrow(res: Response, fallback: string) {
  if (!res.ok) throw new Error(await apiDetail(res, fallback));
  return res;
}
