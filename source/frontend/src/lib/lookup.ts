"use client";

import { getAccounts } from "@/lib/account";
import { getCategories } from "@/lib/category";

// id -> name maps, for turning the ids on a task or ticket into text
export type Lookups = {
  categoryById: Map<number, string>;
  accountById: Map<string, string>;
};

// Both are cached and neither is essential: a miss only means a row shows
// "Category #3" or "-", so a failed lookup never fails the list.
export async function loadLookups(): Promise<Lookups> {
  const [categories, accounts] = await Promise.all([
    getCategories().catch(() => null),
    getAccounts().catch(() => null),
  ]);

  return {
    categoryById: new Map(
      (categories?.Categories ?? []).map((category) => [
        category.id,
        category.name,
      ]),
    ),
    accountById: new Map(
      (accounts?.Accounts ?? []).map((account) => [
        account.id,
        account.username,
      ]),
    ),
  };
}
