type Entry<T> = {
  promise: Promise<T>;
  at: number;
  settled: boolean;
};

const CACHE_NAME = "api-cache";

export function cached<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ttlMs: number,
) {
  const pending = new Map<string, Entry<T>>();

  const getCache = async () => {
    if (typeof window === "undefined" || !("caches" in window)) {
      return null;
    }

    return caches.open(CACHE_NAME);
  };

  const getKey = (...args: A) => {
    return new Request(
      `${location.origin}/__api-cache__/${encodeURIComponent(JSON.stringify(args))}`,
    );
  };

  const wrapped = (...args: A): Promise<T> => {
    const key = JSON.stringify(args);
    const hit = pending.get(key);

    if (hit && (!hit.settled || Date.now() - hit.at < ttlMs)) {
      return hit.promise;
    }

    const entry: Entry<T> = {
      promise: Promise.resolve().then(async () => {
        const cache = await getCache();
        const request = getKey(...args);

        if (cache && ttlMs > 0) {
          const response = await cache.match(request);

          if (response) {
            const cachedAt = Number(response.headers.get("x-cache-time"));

            if (Date.now() - cachedAt < ttlMs) {
              return response.json() as Promise<T>;
            }

            await cache.delete(request);
          }
        }

        const result = await fn(...args);

        if (cache && ttlMs > 0) {
          const response = new Response(JSON.stringify(result), {
            headers: {
              "Content-Type": "application/json",
              "x-cache-time": String(Date.now()),
            },
          });

          await cache.put(request, response);
        }

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

  wrapped.clear = () => {
    pending.clear();

    void getCache().then((cache) => {
      if (cache) {
        return cache
          .keys()
          .then((requests) =>
            Promise.all(requests.map((request) => cache.delete(request))),
          );
      }
    });
  };

  return wrapped;
}
