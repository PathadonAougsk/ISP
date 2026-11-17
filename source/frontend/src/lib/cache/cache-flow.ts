import {
  createFamily,
  getFamily,
  type Families,
  type Family,
  type FamilyPage,
} from "@/lib/cache/cache-family";
import {
  addPage,
  dropFamily,
  resetFamily,
} from "@/lib/cache/cache-family-pages";
import {
  getKey,
  readResult,
  saveResult,
  type CacheContext,
} from "@/lib/cache/cache-storage";

export type Entry<T> = {
  promise: Promise<T>;
  expiresAt: number;
  settled: boolean;
};

// all state one request flow need
export type FlowContext<T> = {
  cache: Cache | null;
  ctx: CacheContext;
  entry: Entry<T>;
  pending: Map<string, Entry<T>>;
  families: Families;
  key: string;
  familyKey: string | null;
  ttlMs: number;
  page: FamilyPage;
  paging: { offset: number; limit: number } | null;
  fetchFresh: () => Promise<T>;
  evict: (pageKey: string) => void;
  slice?: (result: T, limit: number) => T;
  total?: (result: T) => number | undefined;
};

// 1. expiry from family record, own ttl if no family
export const resolveFamily = async <T>({
  cache,
  families,
  familyKey,
  ttlMs,
  evict,
}: FlowContext<T>): Promise<Family | null> => {
  if (!familyKey) return null;

  let family = await getFamily(cache, families, familyKey);

  if (family && family.expiresAt <= Date.now()) {
    await dropFamily(cache, families, familyKey, family, evict);
    family = null;
  }

  if (!family) {
    family = await createFamily(cache, families, familyKey, Date.now() + ttlMs);
  }

  return family;
};

// 2. bigger entry, same offset, is authoritative
export const readBigger = async <T>(
  { cache, ctx, pending, paging, slice }: FlowContext<T>,
  family: Family | null,
): Promise<{ value: T } | null> => {
  if (!family || !slice || !paging) return null;

  for (const other of [...family.pages]) {
    if (other.offset !== paging.offset || other.limit <= paging.limit) {
      continue;
    }

    const inMemory = pending.get(other.key);

    if (inMemory?.settled) {
      if (inMemory.expiresAt > Date.now()) {
        return { value: slice(await inMemory.promise, paging.limit) };
      }

      pending.delete(other.key);
    }

    const bigger = await readResult<T>({
      cache,
      request: cache ? getKey(other.key) : null,
      guard: ctx.guard,
    });

    if (bigger.hit) return { value: slice(bigger.value as T, paging.limit) };
  }

  return null;
};

// 3. exact entry
export const readExact = async <T>(
  { cache, ctx, entry, families, familyKey, page }: FlowContext<T>,
  family: Family | null,
): Promise<{ value: T } | null> => {
  const exact = await readResult<T>(ctx);

  if (!exact.hit) return null;

  // hit never extend expiry
  if (!family && exact.expiresAt !== undefined) {
    entry.expiresAt = exact.expiresAt;
  }

  if (familyKey && family && ctx.guard.isSameGeneration()) {
    await addPage(cache, families, familyKey, page);
  }

  return { value: exact.value as T };
};

// 4. fetch and save
export const fetchAndSave = async <T>(
  {
    cache,
    ctx,
    families,
    familyKey,
    key,
    page,
    fetchFresh,
    evict,
    total,
  }: FlowContext<T>,
  family: Family | null,
  expiresAt: number,
): Promise<T> => {
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
};
