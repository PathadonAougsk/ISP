import { getKey, safe } from "@/lib/cache/cache-storage";
import {
  familyRequest,
  persist,
  type Families,
  type Family,
  type FamilyPage,
} from "@/lib/cache/cache-family";

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
