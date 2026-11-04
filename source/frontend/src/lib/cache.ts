import { createClient } from "@/lib/supabase/client";

type Entry<T> = {
  promise: Promise<T>;
  at: number;
  settled: boolean;
  expiresAt?: number;
};

const CACHE_PREFIX = "api-cache";

type CachedFunction<A extends unknown[], T> = ((...args: A) => Promise<T>) & {
  clear: () => Promise<void>;
};

const cacheClearers = new Set<() => Promise<void>>();

export async function clearAllApiCache(): Promise<void> {
  await Promise.all(Array.from(cacheClearers, (clear) => clear()));
}

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

// ignore pagination (offset and limit) but keep all other params
export function withoutPagination<
  T extends { limit?: number; offset?: number },
>(params?: T): string {
  const { limit, offset, ...rest } = params ?? ({} as T);
  return JSON.stringify(rest);
}

export function cached<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ttlMs: number,
  name: string,
  family?: (...args: A) => string,
) {
  const pending = new Map<string, Entry<T>>();
  const familyExpirations = new Map<string, number>();
  const familyInitializations = new Map<string, Promise<number>>();
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

  const getFamilyExpiry = async (
    cache: Cache | null,
    familyKey: string,
  ): Promise<number | null> => {
    const memoryExpiry = familyExpirations.get(familyKey);

    if (memoryExpiry !== undefined && memoryExpiry > Date.now()) {
      return memoryExpiry;
    }

    familyExpirations.delete(familyKey);

    if (!cache) return null;

    try {
      const request = getKey(`family:${familyKey}`);
      const response = await cache.match(request);

      if (!response) return null;

      const { expiresAt } = (await response.json()) as {
        expiresAt: number;
      };

      if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
        familyExpirations.set(familyKey, expiresAt);
        return expiresAt;
      }

      await cache.delete(request);
    } catch {
      // Ignore cache errors
    }

    return null;
  };

  const saveFamilyExpiry = async (
    cache: Cache | null,
    familyKey: string,
    expiresAt: number,
  ) => {
    familyExpirations.set(familyKey, expiresAt);

    if (!cache) return;

    try {
      await cache.put(
        getKey(`family:${familyKey}`),
        new Response(JSON.stringify({ expiresAt }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    } catch {
      // Ignore cache errors
    }
  };

  const saveResult = async (
    cache: Cache | null,
    request: Request | null,
    key: string,
    entry: Entry<T>,
    startedGeneration: number,
    result: T,
    expiresAt?: number,
  ) => {
    if (
      !cache ||
      !request ||
      pending.get(key) !== entry ||
      generation !== startedGeneration
    ) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (expiresAt !== undefined) {
        headers["x-cache-expiry"] = String(expiresAt);
      } else {
        headers["x-cache-time"] = String(Date.now());
      }

      await cache.put(
        request,
        new Response(JSON.stringify(result), { headers }),
      );

      // clear() landed while put running, remove what we just wrote
      if (generation !== startedGeneration) {
        await cache.delete(request);
      }
    } catch {
      // Ignore cache storage errors
    }
  };

  const wrapped: CachedFunction<A, T> = async (...args: A): Promise<T> => {
    // no session = no cache, so nothing can leak to next user
    const userId = await getUserId();
    if (!userId) return fn(...args);

    const key = `${userId}:${JSON.stringify(args)}`;
    const familyKey =
      family && ttlMs > 0 ? `${userId}:${family(...args)}` : null;

    const hit = pending.get(key);

    if (
      hit &&
      (!hit.settled ||
        (familyKey
          ? hit.expiresAt !== undefined && Date.now() < hit.expiresAt
          : Date.now() - hit.at < ttlMs))
    ) {
      return hit.promise;
    }

    const startedGeneration = generation;

    const entry: Entry<T> = {
      promise: Promise.resolve().then(async () => {
        // wait old delete finish, so no half deleted read
        await clearing;

        const cache = await getCache();
        const request = cache && ttlMs > 0 ? getKey(key) : null;

        if (familyKey) {
          let expiresAt = await getFamilyExpiry(cache, familyKey);

          // First request establishes the shared expiration
          if (expiresAt === null) {
            let initialization = familyInitializations.get(familyKey);

            if (!initialization) {
              let resolveInitialization!: (value: number) => void;
              let rejectInitialization!: (reason: unknown) => void;

              initialization = new Promise<number>((resolve, reject) => {
                resolveInitialization = resolve;
                rejectInitialization = reject;
              });

              familyInitializations.set(familyKey, initialization);

              try {
                const result = await fn(...args);
                expiresAt = Date.now() + ttlMs;

                if (generation === startedGeneration) {
                  await saveFamilyExpiry(cache, familyKey, expiresAt);
                }

                resolveInitialization(expiresAt);

                entry.expiresAt = expiresAt;

                await saveResult(
                  cache,
                  request,
                  key,
                  entry,
                  startedGeneration,
                  result,
                  expiresAt,
                );

                return result;
              } catch (error) {
                rejectInitialization(error);
                throw error;
              } finally {
                if (familyInitializations.get(familyKey) === initialization) {
                  familyInitializations.delete(familyKey);
                }
              }
            }

            expiresAt = await initialization;
          }

          entry.expiresAt = expiresAt;

          // Try the exact request cache entry
          if (cache && request) {
            try {
              const response = await cache.match(request);

              if (response) {
                const cachedExpiry = Number(
                  response.headers.get("x-cache-expiry"),
                );

                if (cachedExpiry === expiresAt && expiresAt > Date.now()) {
                  return (await response.json()) as T;
                }

                await cache.delete(request);
              }
            } catch {
              // Ignore cache errors and fetch fresh data
            }
          }

          const result = await fn(...args);

          await saveResult(
            cache,
            request,
            key,
            entry,
            startedGeneration,
            result,
            expiresAt,
          );

          return result;
        }

        // Original independent expiration behavior
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

        await saveResult(cache, request, key, entry, startedGeneration, result);

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
    familyExpirations.clear();
    familyInitializations.clear();
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

  cacheClearers.add(wrapped.clear);

  return wrapped;
}
