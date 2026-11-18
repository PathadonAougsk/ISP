import { createClient } from "@/lib/supabase/client";

// Small in-memory cache for GET calls. Key = signed in user + args, so one
// user never see another's data. Every write call clear(), so lists stay fresh.

type CachedFunction<A extends unknown[], T> = ((...args: A) => Promise<T>) & {
  clear: () => Promise<void>;
};

const clearers = new Set<() => void>();

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

export function cached<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ttlMs: number,
): CachedFunction<A, T> {
  const entries = new Map<string, { promise: Promise<T>; expiresAt: number }>();

  const wrapped = async (...args: A): Promise<T> => {
    // no session = no cache, so nothing can leak to next user
    const userId = await getUserId();
    if (!userId) return fn(...args);

    const key = `${userId}:${JSON.stringify(args)}`;
    const hit = entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.promise;

    // same promise for calls at the same time, one request only
    const entry = { promise: fn(...args), expiresAt: Date.now() + ttlMs };
    entries.set(key, entry);

    // failed request is not kept, next call try again
    entry.promise.catch(() => {
      if (entries.get(key) === entry) entries.delete(key);
    });

    return entry.promise;
  };

  const clear = () => entries.clear();
  clearers.add(clear);

  return Object.assign(wrapped, {
    clear: async () => clear(),
  });
}

export async function clearAllApiCache(): Promise<void> {
  clearers.forEach((clear) => clear());
}
