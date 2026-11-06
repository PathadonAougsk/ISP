import { createClient } from "@/lib/supabase/client";

// signed in user id, null if no session or lookup fail
export async function getUserId(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await createClient().auth.getSession();

    return session?.user.id ?? null;
  } catch {
    return null;
  }
}

// ignore pagination (offset and limit) but keep all other params
export function withoutPagination<
  T extends { limit?: number; offset?: number },
>(params?: T): string {
  const { limit, offset, ...rest } = params ?? ({} as T);
  return JSON.stringify(rest);
}
