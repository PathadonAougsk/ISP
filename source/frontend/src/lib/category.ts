"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { cached } from "@/lib/cache";

const CACHE_TTL = 60 * 1000;

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then(({ Categories }) => {
        if (!cancelled) {
          setCategories(Categories);
          setCategoriesError(null);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setCategoriesError(
            err instanceof Error ? err.message : "Failed to load categories",
          );
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, categoriesLoading, categoriesError };
}

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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export const getCategories = cached(fetchCategories, 60 * 1000);

export async function createCategory(name: string): Promise<void> {
  const res = await apiFetch("/category/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  getCategories.clear();
}

export async function updateCategory(id: number, name: string): Promise<void> {
  const res = await apiFetch(`/category/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  getCategories.clear();
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await apiFetch(`/category/${id}`, { method: "DELETE" });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  getCategories.clear();
}

// id -> name lookup, e.g. { 1: "Report 1", 2: "Report 2" }
export function toCategoryMap(categories: Category[]): CategoryMap {
  return Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  );
}
