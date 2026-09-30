"use client";

import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

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
    return Object.fromEntries(categories.map((category) => [category.id, category.name]));
}

export default function Categories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");

    const refresh = useCallback(
        () =>
            getCategories()
                .then((body) => {
                    setCategories(body.Categories);
                    setError(null);
                })
                .catch(() => {
                    setCategories([]);
                    setError("Could not load categories.");
                })
                .finally(() => {
                    setLoading(false);
                }),
        [],
    );

    useEffect(() => {
        refresh();
    }, [refresh]);

    async function run(action: () => Promise<void>, message: string) {
        try {
            await action();
            await refresh();
        } catch {
            setError(message);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;

        setNewName("");
        await run(() => createCategory(name), `Could not create "${name}".`);
    }

    async function handleRename(id: number) {
        const name = editingName.trim();
        setEditingId(null);
        if (!name) return;

        await run(() => updateCategory(id, name), `Could not rename category ${id}.`);
    }

    const visible = categories.filter((category) =>
        category.name.toLowerCase().includes(query.trim().toLowerCase()),
    );

    return (
        <section className="flex flex-col gap-7">
            <h2 className="text-[28px] leading-tight">Category</h2>

            <div className="flex flex-col gap-1.5">
                <p>Categories For Tickets And Tasks</p>
                <p className="text-[#8a8a8a]">
                    Categories group the tickets and tasks your lab handles. Renaming one updates it
                    everywhere it is already in use.
                </p>
            </div>

            <form onSubmit={handleCreate} className="flex items-center gap-3">
                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New category name"
                    className="h-10 flex-1 border border-[#d0d0d0] bg-[#dedede] px-3 outline-none placeholder:text-[#8a8a8a]"
                />
                <button
                    type="submit"
                    className="h-10 w-25 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8] disabled:opacity-50"
                    disabled={!newName.trim()}
                >
                    Add
                </button>
            </form>

            <div className="flex items-center justify-between gap-3">
                <p className="text-lg">All Categories</p>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                    className="h-10 w-62.5 border border-[#d0d0d0] bg-[#dedede] px-3 outline-none placeholder:text-[#8a8a8a]"
                />
            </div>

            {error && <p className="text-[#b3261e]">{error}</p>}

            <div className="flex flex-col">
                <div className="flex items-center gap-3 border-b border-[#d0d0d0] pb-2 text-sm text-[#8a8a8a] uppercase">
                    <span className="w-15">ID</span>
                    <span className="flex-1">Name</span>
                </div>

                {loading ? (
                    <p className="py-4 text-[#8a8a8a]">Loading...</p>
                ) : visible.length === 0 ? (
                    <p className="py-4 text-[#8a8a8a]">
                        {categories.length === 0 ? "No categories yet." : "No categories match that search."}
                    </p>
                ) : (
                    visible.map((category) => (
                        <div
                            key={category.id}
                            className="flex items-center gap-3 border-b border-[#e0e0e0] py-3"
                        >
                            <span className="w-15 text-[#8a8a8a]">{category.id}</span>

                            {editingId === category.id ? (
                                <input
                                    autoFocus
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={() => handleRename(category.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRename(category.id);
                                        if (e.key === "Escape") setEditingId(null);
                                    }}
                                    className="h-10 flex-1 border border-[#d0d0d0] bg-[#dedede] px-3 outline-none"
                                />
                            ) : (
                                <span className="flex-1">{category.name}</span>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setEditingId(category.id);
                                    setEditingName(category.name);
                                }}
                                className="h-10 w-25 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8]"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    run(
                                        () => deleteCategory(category.id),
                                        `Could not delete "${category.name}".`,
                                    )
                                }
                                className="h-10 w-25 bg-[#d4d4d4] text-base hover:bg-[#c8c8c8]"
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
