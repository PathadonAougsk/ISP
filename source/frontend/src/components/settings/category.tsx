"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
} from "@/lib/category";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import {
  ERROR,
  HEAD,
  LIST_PANEL,
  MESSAGE,
  MUTED,
  ROW,
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
  const [savingId, setSavingId] = useState<number | null>(null);

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
    if (!isAdmin || !name || savingId !== null) return;

    if (name === categories.find((c) => c.id === id)?.name) {
      setEditingId(null);
      return;
    }

    setSavingId(id);

    try {
      await run(
        () => updateCategory(id, name),
        `Could not rename category ${id}.`,
      );
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  }

  const visible = categories
    .filter((category) =>
      category.name.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.id - b.id);

  return (
    <section className="flex flex-col gap-5">
      <h1 className={TITLE}>Category</h1>

      <div className="flex flex-col gap-1.5">
        <p className="font-semibold">Categories For Tickets And Tasks</p>
        <p className={MUTED}>
          Categories group the tickets and tasks your lab handles. Renaming one
          updates it everywhere it is already in use.
        </p>
      </div>

      {isAdmin ? (
        <form onSubmit={handleCreate} className="flex items-start gap-3">
          <div className="flex-1">
            <TextInput
              look="outlined"
              value={newName}
              onChange={setNewName}
              placeholder="New category name"
              maxLength={30}
            />
          </div>
          <Button
            variant="green"
            size="md"
            type="submit"
            disabled={!newName.trim()}
            className="h-10 min-w-25 px-4 font-bold"
          >
            Add
          </Button>
        </form>
      ) : (
        <p className={MUTED}>
          Only a Lab Owner or Lab Admin can add, rename or delete categories.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold w-40">
          All Categories
          <span className={MUTED}> ({categories.length})</span>
        </p>

        <div className="flex-1">
          <TextInput
            look="outlined"
            value={query}
            onChange={setQuery}
            placeholder="Search by name"
            className="w-full"
          />
        </div>
      </div>

      {error && <p className={ERROR}>{error}</p>}

      <div className={LIST_PANEL}>
        <div className={HEAD}>
          <span className="w-15 shrink-0">ID</span>
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
              <span className="w-15 shrink-0 text-gray-500">{category.id}</span>

              {isAdmin && editingId === category.id ? (
                <div className="min-w-0 flex-1">
                  <TextInput
                    look="outlined"
                    autoFocus
                    maxLength={30}
                    inlineCounter={true}
                    value={editingName}
                    onChange={setEditingName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleRename(category.id);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    className="h-8!"
                  />
                </div>
              ) : (
                <span className="flex-1">{category.name}</span>
              )}

              {isAdmin && (
                <>
                  <Button
                    variant={editingId === category.id ? "green" : "outline"}
                    size="base"
                    disabled={
                      savingId !== null ||
                      (editingId === category.id &&
                        (editingName.trim() === category.name ||
                          !editingName.trim()))
                    }
                    onClick={() => {
                      if (editingId === category.id) {
                        handleRename(category.id);
                      } else {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }
                    }}
                    className="w-25 font-semibold"
                  >
                    {savingId === category.id
                      ? "Saving..."
                      : editingId === category.id
                        ? "Save"
                        : "Edit"}
                  </Button>
                  <Button
                    variant="red"
                    size="base"
                    onClick={() =>
                      run(
                        () => deleteCategory(category.id),
                        `Could not delete "${category.name}".`,
                      )
                    }
                    className="w-25 font-bold"
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
