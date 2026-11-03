import { createClient } from "@/lib/supabase/client";

type Entry<T> = {
  promise: Promise<T>;
  at: number;
  settled: boolean;
};

const CACHE_PREFIX = "api-cache";

// signed in user id, null if no session or lookup fail
async function getUserId(): Promise<string | null> {
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
  name: string,
) {
  const pending = new Map<string, Entry<T>>();
  const cacheName = `${CACHE_PREFIX}-${name}`;

  // bump on every clear(), so old request know it is stale
  let generation = 0;
  // last delete job, reads wait for it
  let clearing: Promise<void> = Promise.resolve();

  const getCache = async (): Promise<Cache | null> => {
    if (typeof window === "undefined" || !("caches" in window)) {
      return null;
    }

    try {
      return await window.caches.open(cacheName);
    } catch {
      return null;
    }
  };

  const getKey = (key: string): Request => {
    return new Request(
      `${window.location.origin}/__api-cache__/${encodeURIComponent(key)}`,
    );
  };

  const wrapped = async (...args: A): Promise<T> => {
    // no session = no cache, so nothing can leak to next user
    const userId = await getUserId();
    if (!userId) return fn(...args);

    const key = `${userId}:${JSON.stringify(args)}`;
    const hit = pending.get(key);

    if (hit && (!hit.settled || Date.now() - hit.at < ttlMs)) {
      return hit.promise;
    }

    const startedGeneration = generation;

    const entry: Entry<T> = {
      promise: Promise.resolve().then(async () => {
        // wait old delete finish, so no half deleted read
        await clearing;

        const cache = await getCache();
        const request = cache && ttlMs > 0 ? getKey(key) : null;

        if (cache && request) {
          try {
            const response = await cache.match(request);

            if (response) {
              const cachedAt = Number(response.headers.get("x-cache-time"));

              if (Number.isFinite(cachedAt) && Date.now() - cachedAt < ttlMs) {
                return (await response.json()) as T;
              }

              await cache.delete(request);
            }
          } catch {
            // Ignore cache errors and fetch fresh data
          }
        }

        const result = await fn(...args);

        // Do not write results from requests invalidated by clear()
        if (cache && request && pending.get(key) === entry) {
          try {
            const response = new Response(JSON.stringify(result), {
              headers: {
                "Content-Type": "application/json",
                "x-cache-time": String(Date.now()),
              },
            });

            await cache.put(request, response);

            // clear() land while put running, remove what we just wrote
            if (generation !== startedGeneration) {
              await cache.delete(request);
            }
          } catch {
            // Ignore cache storage errors
          }
        }

        return result;
      }),
      at: Date.now(),
      settled: false,
    };

    pending.set(key, entry);

    entry.promise.then(
      () => {
        entry.settled = true;
        entry.at = Date.now();
      },
      () => {
        if (pending.get(key) === entry) {
          pending.delete(key);
        }
      },
    );

    return entry.promise;
  };

  wrapped.clear = (): Promise<void> => {
    pending.clear();
    generation += 1;

    if (typeof window !== "undefined" && "caches" in window) {
      // chain deletes, never reject
      clearing = clearing
        .then(() => window.caches.delete(cacheName))
        .then(
          () => {},
          () => {},
        );
    }

    return clearing;
  };

  return wrapped;
}
