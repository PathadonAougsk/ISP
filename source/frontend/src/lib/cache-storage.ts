export type SaveGuard = {
  // entry still the pending one and no clear() happened
  isActive: () => boolean;
  // no clear() happened since start
  isSameGeneration: () => boolean;
};

export const getCache = async (cacheName: string): Promise<Cache | null> => {
  if (typeof window === "undefined" || !("caches" in window)) {
    return null;
  }

  try {
    return await window.caches.open(cacheName);
  } catch {
    return null;
  }
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
  cache: Cache | null,
  request: Request | null,
  isValid: (response: Response) => boolean,
): Promise<{ hit: boolean; value?: T }> => {
  if (!cache || !request) return { hit: false };

  try {
    const response = await cache.match(request);

    if (!response) return { hit: false };

    if (isValid(response)) {
      return { hit: true, value: (await response.json()) as T };
    }

    await cache.delete(request);
  } catch {
    // Ignore cache errors and fetch fresh data
  }

  return { hit: false };
};

export const getFamilyExpiry = async (
  cache: Cache | null,
  familyExpirations: Map<string, number>,
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

export const saveFamilyExpiry = async (
  cache: Cache | null,
  familyExpirations: Map<string, number>,
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

export const saveResult = async <T>(
  cache: Cache | null,
  request: Request | null,
  result: T,
  guard: SaveGuard,
  expiresAt?: number,
) => {
  if (!cache || !request || !guard.isActive()) return;

  try {
    await cache.put(
      request,
      new Response(JSON.stringify(result), {
        headers: buildHeaders(expiresAt),
      }),
    );

    // clear() landed while put running, remove what we just wrote
    if (!guard.isSameGeneration()) {
      await cache.delete(request);
    }
  } catch {
    // Ignore cache storage errors
  }
};
