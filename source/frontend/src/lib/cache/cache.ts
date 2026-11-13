import { getPaging, getUserId } from "@/lib/cache/cache-utils";
import {
  addPage,
  createFamily,
  dropFamily,
  getFamily,
  resetFamily,
  type Families,
  type Family,
} from "@/lib/cache/cache-family";
import {
  getCache,
  getKey,
  readResult,
  saveResult,
  sweepExpired,
  type CacheContext,
} from "@/lib/cache/cache-storage";

export { withoutPagination } from "@/lib/cache/cache-utils";

type Entry<T> = {
  promise: Promise<T>;
  expiresAt: number;
  settled: boolean;
};

const CACHE_PREFIX = "api-cache";

type CachedFunction<A extends unknown[], T> = ((...args: A) => Promise<T>) & {
  clear: () => Promise<void>;
};

const cacheClearers = new Set<() => Promise<void>>();

let cacheInitialization: Promise<void> | null = null;

export function initializeApiCache(): Promise<void> {
  if (!cacheInitialization) {
    // persist across reload, only remove expired
    cacheInitialization = sweepExpired(`${CACHE_PREFIX}-`);
  }

  return cacheInitialization;
}

export async function clearAllApiCache(): Promise<void> {
  await Promise.all(Array.from(cacheClearers, (clear) => clear()));

  // module not loaded yet never register, so sweep by prefix too
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const names = await window.caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(`${CACHE_PREFIX}-`))
        .map((name) => window.caches.delete(name)),
    );
  } catch {
    // best effort, never block sign out
  }
}

export function cached<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ttlMs: number,
  name: string,
  family?: (...args: A) => string,
  slice?: (result: T, limit: number) => T,
  total?: (result: T) => number | undefined,
) {
  const pending = new Map<string, Entry<T>>();
  const families: Families = new Map();
  const cacheName = `${CACHE_PREFIX}-${name}`;

  // bump on every clear(), so old requests can't save stale results
  let generation = 0;

  // last delete job, reads wait for it
  let clearing: Promise<void> = Promise.resolve();

  const wrapped: CachedFunction<A, T> = async (...args: A): Promise<T> => {
    await initializeApiCache();
    // no session = no cache, so nothing can leak to next user
    const userId = await getUserId();
    if (!userId) return fn(...args);

    const key = `${userId}:${JSON.stringify(args)}`;
    const familyKey =
      family && ttlMs > 0 ? `${userId}:${family(...args)}` : null;

    const hit = pending.get(key);

    if (hit) {
      if (!hit.settled || hit.expiresAt > Date.now()) return hit.promise;

      pending.delete(key);
    }

    const startedGeneration = generation;

    const entry: Entry<T> = {
      promise: Promise.resolve().then(async () => {
        // wait old delete finish, so no half deleted read
        await clearing;

        const cache = await getCache(cacheName);

        const ctx: CacheContext = {
          cache,
          request: cache && ttlMs > 0 ? getKey(key) : null,
          guard: {
            isActive: () =>
              pending.get(key) === entry && generation === startedGeneration,
            isSameGeneration: () => generation === startedGeneration,
          },
        };

        const fetchFresh = () => fn(...args);

        // drop settled page from pending, never the current one
        const evict = (pageKey: string) => {
          if (pageKey !== key && pending.get(pageKey)?.settled) {
            pending.delete(pageKey);
          }
        };

        // 1. expiry from family record, own ttl if no family
        let family: Family | null = null;

        if (familyKey) {
          family = await getFamily(cache, families, familyKey);

          if (family && family.expiresAt <= Date.now()) {
            await dropFamily(cache, families, familyKey, family, evict);
            family = null;
          }

          if (!family) {
            family = await createFamily(
              cache,
              families,
              familyKey,
              Date.now() + ttlMs,
            );
          }

          // clear() landed meanwhile, skip cache
          if (!ctx.guard.isSameGeneration()) return fetchFresh();
        }

        const expiresAt = family ? family.expiresAt : Date.now() + ttlMs;

        entry.expiresAt = expiresAt;

        const paging = getPaging(args);
        const page = {
          key,
          offset: paging?.offset ?? 0,
          limit: paging?.limit ?? Number.MAX_SAFE_INTEGER,
        };

        // 2. bigger entry, same offset, is authoritative
        if (family && slice && paging) {
          for (const other of [...family.pages]) {
            if (other.offset !== paging.offset || other.limit <= paging.limit) {
              continue;
            }

            const inMemory = pending.get(other.key);

            if (inMemory?.settled) {
              if (inMemory.expiresAt > Date.now()) {
                return slice(await inMemory.promise, paging.limit);
              }

              pending.delete(other.key);
            }

            const bigger = await readResult<T>({
              cache,
              request: cache ? getKey(other.key) : null,
              guard: ctx.guard,
            });

            if (bigger.hit) return slice(bigger.value as T, paging.limit);
          }
        }

        // 3. exact entry
        const exact = await readResult<T>(ctx);

        if (exact.hit) {
          // hit never extend expiry
          if (!family && exact.expiresAt !== undefined) {
            entry.expiresAt = exact.expiresAt;
          }

          if (familyKey && family && ctx.guard.isSameGeneration()) {
            await addPage(cache, families, familyKey, page);
          }

          return exact.value as T;
        }

        // 4. fetch and save
        const result = await fetchFresh();

        await saveResult(ctx, result, expiresAt);

        if (
          familyKey &&
          family &&
          ctx.guard.isSameGeneration() &&
          families.get(familyKey) === family
        ) {
          const count = total?.(result);

          // total changed = dataset changed, keep only this page
          if (
            count !== undefined &&
            family.count !== undefined &&
            count !== family.count
          ) {
            await resetFamily(cache, families, familyKey, count, key, evict);
          }

          await addPage(cache, families, familyKey, page, count);
        }

        return result;
      }),
      expiresAt: Date.now() + ttlMs,
      settled: false,
    };

    pending.set(key, entry);

    entry.promise.then(
      () => {
        entry.settled = true;
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
    families.clear();
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
