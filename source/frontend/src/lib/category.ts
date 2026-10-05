import { apiFetch } from "@/lib/api";

export type Category = {
  id: number;
  name: string;
};

export type CategoriesResponse = {
  Categories: Category[];
};

export type CategoryMap = Record<number, string>;

export async function getCategories(): Promise<CategoriesResponse> {
  const res = await apiFetch("/category/");

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function createCategory(name: string): Promise<void> {
  const res = await apiFetch("/category/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
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
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await apiFetch(`/category/${id}`, { method: "DELETE" });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

// id -> name lookup, e.g. { 1: "Report 1", 2: "Report 2" }
export function toCategoryMap(categories: Category[]): CategoryMap {
  return Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  );
}
