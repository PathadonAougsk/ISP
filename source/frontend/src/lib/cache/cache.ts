import { getPaging, getUserId } from "@/lib/cache/cache-utils";
import {
  findBigger,
  resolveFamily,
  savePage,
  type Families,
} from "@/lib/cache/cache-family";

export { getUserId, withoutPagination } from "@/lib/cache/cache-utils";

// Small in-memory cache for GET calls. Key = signed in user + args, so one
// user never see another's data. Every write call clear(), so lists stay fresh.
// Optional `family` (args minus paging) + `slice`: pages of the same filters
// expire together, and a smaller page is cut from a bigger one already here.

type CachedFunction<A extends unknown[], T> = ((...args: A) => Promise<T>) & {
  clear: () => Promise<void>;
};

const clearers = new Set<() => void>();

export function cached<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ttlMs: number,
  family?: (...args: A) => string,
  slice?: (result: T, limit: number) => T,
): CachedFunction<A, T> {
  const entries = new Map<string, { promise: Promise<T>; expiresAt: number }>();
  const families: Families = new Map();
  const dropEntry = (key: string) => entries.delete(key);

  const wrapped = async (...args: A): Promise<T> => {
    // no session = no cache, so nothing can leak to next user
    const userId = await getUserId();
    if (!userId) return fn(...args);

    const key = `${userId}:${JSON.stringify(args)}`;
    const familyKey = family ? `${userId}:${family(...args)}` : null;
    const group = familyKey
      ? resolveFamily(families, familyKey, ttlMs, dropEntry)
      : null;
    const hit = entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.promise;

    // bigger page (same offset) already fresh, serve slice. not stored, no save
    const paging = getPaging(args);
    if (group && slice && paging) {
      const bigger = findBigger(group, paging.offset, paging.limit);
      const source = bigger && entries.get(bigger.key);
      if (source) {
        return source.promise.then((result) => slice(result, paging.limit));
      }
    }

    // same promise for calls at the same time, one request only
    const entry = {
      promise: fn(...args),
      expiresAt: group ? group.expiresAt : Date.now() + ttlMs,
    };
    entries.set(key, entry);

    entry.promise.then(
      () => {
        // only fresh fetch reach here (hit never), so overwrite use new data
        // entry gone = clear() or expired family, skip
        if (group && paging && entries.get(key) === entry) {
          savePage(group, { key, ...paging }, dropEntry);
        }
      },
      // failed request is not kept, next call try again
      () => {
        if (entries.get(key) === entry) entries.delete(key);
      },
    );

    return entry.promise;
  };

  const clear = () => {
    entries.clear();
    families.clear();
  };
  clearers.add(clear);

  return Object.assign(wrapped, {
    clear: async () => clear(),
  });
}

export async function clearAllApiCache(): Promise<void> {
  clearers.forEach((clear) => clear());
}
