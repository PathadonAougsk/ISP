import {
  buildHeaders,
  getKey,
  putJson,
  safe,
} from "@/lib/cache/cache-storage";

export type FamilyPage = { key: string; offset: number; limit: number };

export type Family = {
  expiresAt: number;
  count?: number;
  pages: FamilyPage[];
};

export type Families = Map<string, Family>;

const familyRequest = (familyKey: string): Request =>
  getKey(`family:${familyKey}`);

// save family record, expiry header so sweep can clean it too
const persist = async (
  cache: Cache | null,
  familyKey: string,
  family: Family,
) => {
  if (!cache) return;

  await safe<void>(
    () =>
      putJson(
        cache,
        familyRequest(familyKey),
        family,
        buildHeaders(family.expiresAt),
      ),
    undefined,
  );
};

// delete page entries from Cache API, tell caller so pending can drop them
const removePages = async (
  cache: Cache | null,
  pages: FamilyPage[],
  onPage: (key: string) => void,
) => {
  pages.forEach((page) => onPage(page.key));

  if (!cache) return;

  const store = cache;

  await Promise.all(
    pages.map((page) =>
      safe<boolean>(() => store.delete(getKey(page.key)), false),
    ),
  );
};

// raw record from memory or Cache API, caller check expiry
export const getFamily = async (
  cache: Cache | null,
  families: Families,
  familyKey: string,
): Promise<Family | null> => {
  const known = families.get(familyKey);

  if (known) return known;

  if (!cache) return null;

  const store = cache;

  return safe<Family | null>(async () => {
    const request = familyRequest(familyKey);
    const response = await store.match(request);

    if (!response) return null;

    const family = (await response.json()) as Family;

    if (!Number.isFinite(family.expiresAt) || !Array.isArray(family.pages)) {
      await store.delete(request);
      return null;
    }

    // another request may fill memory while we read
    const current = families.get(familyKey);

    if (current) return current;

    families.set(familyKey, family);

    return family;
  }, null);
};

// get or create, so parallel first requests share one record
export const createFamily = async (
  cache: Cache | null,
  families: Families,
  familyKey: string,
  expiresAt: number,
): Promise<Family> => {
  const current = families.get(familyKey);

  if (current && current.expiresAt > Date.now()) return current;

  const family: Family = { expiresAt, pages: [] };

  families.set(familyKey, family);

  await persist(cache, familyKey, family);

  return family;
};

export const addPage = async (
  cache: Cache | null,
  families: Families,
  familyKey: string,
  page: FamilyPage,
  count?: number,
) => {
  const family = families.get(familyKey);

  if (!family) return;

  const index = family.pages.findIndex((item) => item.key === page.key);
  const same =
    index >= 0 &&
    family.pages[index].offset === page.offset &&
    family.pages[index].limit === page.limit;
  const baseline = family.count === undefined && count !== undefined;

  if (same && !baseline) return;

  if (index >= 0) family.pages[index] = page;
  else family.pages.push(page);

  if (baseline) family.count = count;

  await persist(cache, familyKey, family);
};

// remove whole family and its pages (expired)
export const dropFamily = async (
  cache: Cache | null,
  families: Families,
  familyKey: string,
  family: Family,
  onPage: (key: string) => void,
) => {
  if (families.get(familyKey) === family) families.delete(familyKey);

  await removePages(cache, family.pages, onPage);

  // new family may born while deleting, don't remove its record
  if (!cache || families.has(familyKey)) return;

  const store = cache;

  await safe<boolean>(() => store.delete(familyRequest(familyKey)), false);
};

// count changed, keep only newest page and set new baseline
export const resetFamily = async (
  cache: Cache | null,
  families: Families,
  familyKey: string,
  count: number,
  keepKey: string,
  onPage: (key: string) => void,
) => {
  const family = families.get(familyKey);

  if (!family) return;

  const dropped = family.pages.filter((page) => page.key !== keepKey);

  family.pages = family.pages.filter((page) => page.key === keepKey);
  family.count = count;

  await removePages(cache, dropped, onPage);
  await persist(cache, familyKey, family);
};
