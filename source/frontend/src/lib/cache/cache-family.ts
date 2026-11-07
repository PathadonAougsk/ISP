import { getKey, putJson, safe, type CacheContext } from "@/lib/cache/cache-storage";

export type FamilyContext<T> = CacheContext & {
  familyKey: string;
  ttlMs: number;
  expirations: Map<string, number>;
  initializations: Map<string, Promise<number>>;
  fetchFresh: () => Promise<T>;
};

export type FamilyResult<T> = { expiresAt: number; fresh?: { value: T } };

export const getFamilyExpiry = async (
  cache: Cache | null,
  expirations: Map<string, number>,
  familyKey: string,
): Promise<number | null> => {
  const memoryExpiry = expirations.get(familyKey);

  if (memoryExpiry !== undefined && memoryExpiry > Date.now()) {
    return memoryExpiry;
  }

  expirations.delete(familyKey);

  if (!cache) return null;

  return safe<number | null>(async () => {
    const request = getKey(`family:${familyKey}`);
    const response = await cache.match(request);

    if (!response) return null;

    const { expiresAt } = (await response.json()) as {
      expiresAt: number;
    };

    if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
      expirations.set(familyKey, expiresAt);
      return expiresAt;
    }

    await cache.delete(request);

    return null;
  }, null);
};

export const saveFamilyExpiry = async (
  cache: Cache | null,
  expirations: Map<string, number>,
  familyKey: string,
  expiresAt: number,
) => {
  expirations.set(familyKey, expiresAt);

  if (!cache) return;

  await safe<void>(
    () =>
      putJson(
        cache,
        getKey(`family:${familyKey}`),
        { expiresAt },
        { "Content-Type": "application/json" },
      ),
    undefined,
  );
};

// leader fetch and set shared expiry, follower wait for leader
export const resolveFamilyExpiry = async <T>(
  ctx: FamilyContext<T>,
): Promise<FamilyResult<T>> => {
  const { cache, guard, familyKey, ttlMs, expirations, initializations } = ctx;

  const known = await getFamilyExpiry(cache, expirations, familyKey);

  if (known !== null) return { expiresAt: known };

  const running = initializations.get(familyKey);

  if (running) return { expiresAt: await running };

  let resolveInit!: (value: number) => void;
  let rejectInit!: (reason: unknown) => void;

  const initialization = new Promise<number>((resolve, reject) => {
    resolveInit = resolve;
    rejectInit = reject;
  });

  initializations.set(familyKey, initialization);

  try {
    const value = await ctx.fetchFresh();
    const expiresAt = Date.now() + ttlMs;

    if (guard.isSameGeneration()) {
      await saveFamilyExpiry(cache, expirations, familyKey, expiresAt);
    }

    resolveInit(expiresAt);

    return { expiresAt, fresh: { value } };
  } catch (error) {
    rejectInit(error);
    throw error;
  } finally {
    if (initializations.get(familyKey) === initialization) {
      initializations.delete(familyKey);
    }
  }
};
