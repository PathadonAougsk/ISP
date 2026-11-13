export type SaveGuard = {
  // entry still the pending one and no clear() happened
  isActive: () => boolean;
  // no clear() happened since start
  isSameGeneration: () => boolean;
};

export type CacheContext = {
  cache: Cache | null;
  request: Request | null;
  guard: SaveGuard;
};

export type ReadResult<T> = {
  hit: boolean;
  value?: T;
  expiresAt?: number;
};

// run task, any error give fallback
export const safe = async <R>(
  task: () => Promise<R>,
  fallback: R,
): Promise<R> => {
  try {
    return await task();
  } catch {
    return fallback;
  }
};

export const putJson = (
  cache: Cache,
  request: Request,
  body: unknown,
  headers: Record<string, string>,
): Promise<void> =>
  cache.put(request, new Response(JSON.stringify(body), { headers }));

export const getCache = async (cacheName: string): Promise<Cache | null> => {
  if (typeof window === "undefined" || !("caches" in window)) {
    return null;
  }

  return safe<Cache | null>(() => window.caches.open(cacheName), null);
};

export const getKey = (key: string): Request =>
  new Request(
    `${window.location.origin}/__api-cache__/${encodeURIComponent(key)}`,
  );

export const buildHeaders = (expiresAt: number): Record<string, string> => ({
  "Content-Type": "application/json",
  "x-cache-expiry": String(expiresAt),
});

// one expiry for all entries, hit never extend it
export const isFresh = (response: Response): boolean => {
  const expiresAt = Number(response.headers.get("x-cache-expiry"));

  return Number.isFinite(expiresAt) && expiresAt > Date.now();
};

export const readResult = async <T>({
  cache,
  request,
}: CacheContext): Promise<ReadResult<T>> => {
  const miss: ReadResult<T> = { hit: false };

  if (!cache || !request) return miss;

  // cache errors = miss, fetch fresh data
  return safe<ReadResult<T>>(async () => {
    const response = await cache.match(request);

    if (!response) return miss;

    if (isFresh(response)) {
      return {
        hit: true,
        value: (await response.json()) as T,
        expiresAt: Number(response.headers.get("x-cache-expiry")),
      };
    }

    await cache.delete(request);

    return miss;
  }, miss);
};

export const saveResult = async <T>(
  { cache, request, guard }: CacheContext,
  result: T,
  expiresAt: number,
) => {
  if (!cache || !request || !guard.isActive()) return;

  await safe<void>(async () => {
    await putJson(cache, request, result, buildHeaders(expiresAt));

    // clear() landed while put running, remove what we just wrote
    if (!guard.isSameGeneration()) {
      await cache.delete(request);
    }
  }, undefined);
};

// one time sweep, remove expired entries (and old format without expiry)
export const sweepExpired = async (prefix: string): Promise<void> => {
  if (typeof window === "undefined" || !("caches" in window)) return;

  await safe<void>(async () => {
    const names = (await window.caches.keys()).filter((name) =>
      name.startsWith(prefix),
    );

    await Promise.all(
      names.map(async (name) => {
        const cache = await window.caches.open(name);

        for (const request of await cache.keys()) {
          const response = await cache.match(request);

          if (!response || !isFresh(response)) await cache.delete(request);
        }
      }),
    );
  }, undefined);
};
