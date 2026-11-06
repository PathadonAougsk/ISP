import { getUserId } from "@/lib/cache-utils";
import {
  getCache,
  getFamilyExpiry,
  getKey,
  isFresh,
  readResult,
  saveFamilyExpiry,
  saveResult,
} from "@/lib/cache-storage";

export { withoutPagination } from "@/lib/cache-utils";

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

  // bump on every clear(), so old requests can't save stale results
  let generation = 0;

  // last delete job, reads wait for it
  let clearing: Promise<void> = Promise.resolve();

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

        const cache = await getCache(cacheName);
        const request = cache && ttlMs > 0 ? getKey(key) : null;

        const guard = {
          isActive: () =>
            pending.get(key) === entry && generation === startedGeneration,
          isSameGeneration: () => generation === startedGeneration,
        };

        // read cache, else fetch and save
        const readOrFetch = async (
          isValid: (response: Response) => boolean,
          expiresAt?: number,
        ): Promise<T> => {
          const cached = await readResult<T>(cache, request, isValid);

          if (cached.hit) return cached.value as T;

          const result = await fn(...args);

          await saveResult(cache, request, result, guard, expiresAt);

          return result;
        };

        const runFamily = async (familyKey: string): Promise<T> => {
          let expiresAt = await getFamilyExpiry(
            cache,
            familyExpirations,
            familyKey,
          );

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
                  await saveFamilyExpiry(
                    cache,
                    familyExpirations,
                    familyKey,
                    expiresAt,
                  );
                }

                resolveInitialization(expiresAt);
                entry.expiresAt = expiresAt;

                await saveResult(cache, request, result, guard, expiresAt);

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

          const sharedExpiry = expiresAt;

          // Try the exact request cache entry
          return readOrFetch(
            (response) => isFresh(response, ttlMs, sharedExpiry),
            sharedExpiry,
          );
        };

        if (familyKey) return runFamily(familyKey);

        // Original independent expiration behavior
        return readOrFetch((response) => isFresh(response, ttlMs));
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
