"use client";

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
} from "@/lib/category";
import { useCallback, useEffect, useState } from "react";
import {
  BTN,
  DANGER,
  ERROR,
  FIELD,
  HEAD,
  LIST_PANEL,
  MESSAGE,
  MUTED,
  ROW,
  SAVE,
  TITLE,
} from "./settings-style";

export default function Categories({ isAdmin }: { isAdmin: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  // Caching. The request GET /Categories
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

  // Try-Except helper -> Special thank to Wassawin.
  async function run(action: () => Promise<void>, message: string) {
    if (!isAdmin) return;

    try {
      await action();
      await refresh();
    } catch {
      setError(message);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    const name = newName.trim();
    if (!name) return;

    setNewName("");
    await run(() => createCategory(name), `Could not create "${name}".`);
  }

  async function handleRename(id: number) {
    const name = editingName.trim();
    setEditingId(null);
    if (!isAdmin || !name) return;

    await run(
      () => updateCategory(id, name),
      `Could not rename category ${id}.`,
    );
  }

  const visible = categories.filter((category) =>
    category.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <section className="flex flex-col gap-7">
      <h1 className={TITLE}>Category</h1>

      <div className="flex flex-col gap-1.5">
        <p className="font-semibold">Categories For Tickets And Tasks</p>
        <p className={MUTED}>
          Categories group the tickets and tasks your lab handles. Renaming one
          updates it everywhere it is already in use.
        </p>
      </div>

      {isAdmin ? (
        <form onSubmit={handleCreate} className="flex items-center gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className={`${FIELD} flex-1`}
          />
          <button type="submit" className={SAVE} disabled={!newName.trim()}>
            Add
          </button>
        </form>
      ) : (
        <p className={MUTED}>
          Only a Lab Owner or Lab Admin can add, rename or delete categories.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold">All Categories</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name"
          className={`${FIELD} w-62.5`}
        />
      </div>

      {error && <p className={ERROR}>{error}</p>}

      <div className={LIST_PANEL}>
        <div className={HEAD}>
          <span className="w-15">ID</span>
          <span className="flex-1">Name</span>
        </div>

        {loading ? (
          <p className={MESSAGE}>Loading...</p>
        ) : visible.length === 0 ? (
          <p className={MESSAGE}>
            {categories.length === 0
              ? "No categories yet."
              : "No categories match that search."}
          </p>
        ) : (
          visible.map((category) => (
            <div key={category.id} className={ROW}>
              <span className="w-15 text-gray-500">{category.id}</span>

              {isAdmin && editingId === category.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRename(category.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(category.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className={`${FIELD} flex-1`}
                />
              ) : (
                <span className="flex-1">{category.name}</span>
              )}

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                    className={`${BTN} w-25`}
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
                    className={`${DANGER} w-25`}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
