import { getPaging, getUserId } from "@/lib/cache/cache-utils";
import { type Families } from "@/lib/cache/cache-family";
import {
  fetchAndSave,
  readBigger,
  readExact,
  resolveFamily,
  type Entry,
  type FlowContext,
} from "@/lib/cache/cache-flow";
import {
  CACHE_PREFIX,
  initializeApiCache,
  registerClearer,
} from "@/lib/cache/cache-lifecycle";
import { getCache, getKey, type CacheContext } from "@/lib/cache/cache-storage";

export {
  clearAllApiCache,
  initializeApiCache,
} from "@/lib/cache/cache-lifecycle";
export { withoutPagination } from "@/lib/cache/cache-utils";

type CachedFunction<A extends unknown[], T> = ((...args: A) => Promise<T>) & {
  clear: () => Promise<void>;
};

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

        // drop settled page from pending, never the current one
        const evict = (pageKey: string) => {
          if (pageKey !== key && pending.get(pageKey)?.settled) {
            pending.delete(pageKey);
          }
        };

        const paging = getPaging(args);
        const flow: FlowContext<T> = {
          cache,
          ctx,
          entry,
          pending,
          families,
          key,
          familyKey,
          ttlMs,
          paging,
          slice,
          total,
          evict,
          fetchFresh: () => fn(...args),
          page: {
            key,
            offset: paging?.offset ?? 0,
            limit: paging?.limit ?? Number.MAX_SAFE_INTEGER,
          },
        };

        // 1. expiry from family record, own ttl if no family
        const family = await resolveFamily(flow);

        // clear() landed meanwhile, skip cache
        if (familyKey && !ctx.guard.isSameGeneration())
          return flow.fetchFresh();

        const expiresAt = family ? family.expiresAt : Date.now() + ttlMs;

        entry.expiresAt = expiresAt;

        // 2. bigger entry, same offset, is authoritative
        const bigger = await readBigger(flow, family);

        if (bigger) return bigger.value;

        // 3. exact entry
        const exact = await readExact(flow, family);

        if (exact) return exact.value;

        // 4. fetch and save
        return fetchAndSave(flow, family, expiresAt);
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

  registerClearer(wrapped.clear);

  return wrapped;
}
