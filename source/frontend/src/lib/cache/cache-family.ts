export type FamilyPage = { key: string; offset: number; limit: number };

export type Family = { expiresAt: number; pages: FamilyPage[] };

export type Families = Map<string, Family>;

// expiry set once at first init, pages never extend it
// expired family drop all its pages, then born again
export const resolveFamily = (
  families: Families,
  familyKey: string,
  ttlMs: number,
  onDrop: (key: string) => void,
): Family => {
  const known = families.get(familyKey);

  if (known && known.expiresAt > Date.now()) return known;

  known?.pages.forEach((page) => onDrop(page.key));

  const family: Family = { expiresAt: Date.now() + ttlMs, pages: [] };

  families.set(familyKey, family);

  return family;
};

// bigger page, same offset
export const findBigger = (family: Family, offset: number, limit: number) =>
  family.pages.find((page) => page.offset === offset && page.limit > limit);

// add fresh page, bigger overwrite smaller (same offset)
export const savePage = (
  family: Family,
  page: FamilyPage,
  onDrop: (key: string) => void,
) => {
  family.pages = family.pages.filter((item) => {
    const smaller = item.offset === page.offset && item.limit < page.limit;

    if (smaller) onDrop(item.key);

    return !smaller && item.key !== page.key;
  });

  family.pages.push(page);
};
