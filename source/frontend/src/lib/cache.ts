type Entry<T> = { promise: Promise<T>; at: number; settled: boolean };

/**
 * Wraps an async function so that:
 *  - concurrent calls with the same args share ONE request (in-flight dedupe)
 *  - finished results are reused for `ttlMs` (pass 0 for dedupe only)
 *  - failed requests are never cached
 * Call `.clear()` after anything that changes the underlying data.
 */
export function cached<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ttlMs: number,
) {
  const store = new Map<string, Entry<T>>();

  const wrapped = (...args: A): Promise<T> => {
    const key = JSON.stringify(args);
    const hit = store.get(key);

    if (hit && (!hit.settled || Date.now() - hit.at < ttlMs)) {
      return hit.promise;
    }

    const entry: Entry<T> = {
      promise: fn(...args),
      at: Date.now(),
      settled: false,
    };
    store.set(key, entry);

    entry.promise.then(
      () => {
        entry.settled = true;
        entry.at = Date.now(); // TTL counts from when data arrived
      },
      () => {
        if (store.get(key) === entry) store.delete(key);
      },
    );

    return entry.promise;
  };

  wrapped.clear = () => store.clear();
  return wrapped;
}
