import { isFresh, safe } from "@/lib/cache/cache-storage";

export const CACHE_PREFIX = "api-cache";

const cacheClearers = new Set<() => Promise<void>>();

let cacheInitialization: Promise<void> | null = null;

export const registerClearer = (clear: () => Promise<void>) => {
  cacheClearers.add(clear);
};

// one time sweep, remove expired entries (and old format without expiry)
const sweepExpired = async (prefix: string): Promise<void> => {
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

export function clearExpiredApiCache(): Promise<void> {
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
