"use client";

import { useMemo } from "react";
import { apiFetch, apiOrThrow, apiSendJson } from "@/lib/api";
import { cached } from "@/lib/cache/cache";
import { truncateLabel } from "@/lib/format";
import { useFetched } from "@/lib/hooks";

const CACHE_TTL = 30 * 60 * 1000;

export type Category = {
  id: number;
  name: string;
};

export type CategoriesResponse = {
  Categories: Category[];
};

export type CategoryMap = Record<number, string>;

async function fetchCategories(): Promise<CategoriesResponse> {
  const res = await apiFetch("/category/");
  await apiOrThrow(res, `HTTP ${res.status}`);
  return res.json();
}

export const getCategories = cached(fetchCategories, CACHE_TTL, "categories");

export function useCategories() {
  const { data, loading, error } = useFetched(getCategories);
  const categories = useMemo(() => data?.Categories ?? [], [data]);

  return { categories, categoriesLoading: loading, categoriesError: error };
}

export async function createCategory(name: string): Promise<void> {
  await apiOrThrow(
    await apiSendJson("/category/", "POST", { name }),
    "Could not create that category.",
  );

  getCategories.clear();
}

export async function updateCategory(id: number, name: string): Promise<void> {
  await apiOrThrow(
    await apiSendJson(`/category/${id}`, "PUT", { name }),
    "Could not rename that category.",
  );

  getCategories.clear();
}

export async function deleteCategory(id: number): Promise<void> {
  await apiOrThrow(
    await apiFetch(`/category/${id}`, { method: "DELETE" }),
    "Could not delete that category.",
  );

  getCategories.clear();
}

// id -> name lookup, e.g. { 1: "Report 1", 2: "Report 2" }
export function toCategoryMap(categories: Category[]): CategoryMap {
  return Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  );
}

// <Select> options. `short` cuts long names down to fit the filter pills, with
// the full name kept for the tooltip.
export function categoryOptions(categories: Category[], short = false) {
  return categories.map((category) => ({
    value: category.id,
    label: short ? truncateLabel(category.name) : category.name,
    title: category.name,
  }));
}
