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

export type ReadResult<T> = { hit: boolean; value?: T };

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

// family entry use expiry header, normal entry use time header
export const buildHeaders = (expiresAt?: number): Record<string, string> => ({
  "Content-Type": "application/json",
  ...(expiresAt !== undefined
    ? { "x-cache-expiry": String(expiresAt) }
    : { "x-cache-time": String(Date.now()) }),
});

export const isFresh = (
  response: Response,
  ttlMs: number,
  expiresAt?: number,
): boolean => {
  if (expiresAt !== undefined) {
    return (
      Number(response.headers.get("x-cache-expiry")) === expiresAt &&
      expiresAt > Date.now()
    );
  }

  const cachedAt = Number(response.headers.get("x-cache-time"));
  return Number.isFinite(cachedAt) && Date.now() - cachedAt < ttlMs;
};

export const readResult = async <T>(
  { cache, request }: CacheContext,
  isValid: (response: Response) => boolean,
): Promise<ReadResult<T>> => {
  const miss: ReadResult<T> = { hit: false };

  if (!cache || !request) return miss;

  // cache errors = miss, fetch fresh data
  return safe<ReadResult<T>>(async () => {
    const response = await cache.match(request);

    if (!response) return miss;

    if (isValid(response)) {
      return { hit: true, value: (await response.json()) as T };
    }

    await cache.delete(request);

    return miss;
  }, miss);
};

export const saveResult = async <T>(
  { cache, request, guard }: CacheContext,
  result: T,
  expiresAt?: number,
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
