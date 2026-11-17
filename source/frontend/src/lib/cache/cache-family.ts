import { buildHeaders, getKey, putJson, safe } from "@/lib/cache/cache-storage";

export type FamilyPage = { key: string; offset: number; limit: number };

export type Family = {
  expiresAt: number;
  count?: number;
  pages: FamilyPage[];
};

export type Families = Map<string, Family>;

export const familyRequest = (familyKey: string): Request =>
  getKey(`family:${familyKey}`);

// save family record, expiry header so sweep can clean it too
export const persist = async (
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
