"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

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

// id -> name lookup, e.g. { 1: "Report 1", 2: "Report 2" }
export function toCategoryMap(categories: Category[]): CategoryMap {
    return Object.fromEntries(categories.map((category) => [category.id, category.name]));
}

export default function Categories() {
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        getCategories()
            .then((body) => {
                setCategories(body.Categories);
            })
            .catch(() => {
                setCategories([]);
            });
    }, []);

    return <div></div>;
}
