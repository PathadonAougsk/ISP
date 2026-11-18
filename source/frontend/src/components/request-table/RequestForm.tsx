"use client";

import { useState, type ReactNode } from "react";
import { categoryOptions, type Category } from "@/lib/category";
import DateInput from "@/components/ui/date-input";
import { Select, TextArea, TextInput } from "@/components/ui/field";
import {
  dueDateEdit,
  formatDueDate,
} from "@/components/request-table/RequestList";

export const REQUIRED_MESSAGE = "Title and category are required.";

// fields a saved task or ticket row has, for edit mode
type SavedRow = {
  title: string;
  description: string;
  categoryId: number;
  category: string;
  dueDate: string;
  dueDateValue: string;
  dueDateIso: string | null;
};

// Title, category, due date and description of one task or ticket.
// No row = create mode, start empty.
export function useRequestForm(row?: SavedRow) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(
    row?.categoryId ?? "",
  );
  const [dueDate, setDueDate] = useState(row?.dueDateValue ?? "");
  // date box say invalid, block submit
  const [dateInvalid, setDateInvalid] = useState(false);

  const due = row
    ? dueDateEdit(dueDate, row)
    : { changed: dueDate !== "", payload: dueDate || null };

  const hasChanges =
    !row ||
    title.trim() !== row.title ||
    (description || "") !== (row.description || "") ||
    categoryId !== row.categoryId ||
    due.changed;

  // body for POST / PUT, null while title or category is missing
  const values =
    title.trim() && categoryId !== ""
      ? {
          name: title.trim(),
          description: description || null,
          category_id: categoryId,
          due_date: due.payload,
        }
      : null;

  return {
    row,
    title,
    setTitle,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    dueDate,
    setDueDate,
    dateInvalid,
    setDateInvalid,
    hasChanges,
    values,
  };
}

export type RequestForm = ReturnType<typeof useRequestForm>;

// The shared fields. `children` join the category / due date row.
export function RequestFields({
  form,
  categories,
  readOnly = false,
  children,
}: {
  form: RequestForm;
  categories: Category[];
  readOnly?: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <TextInput
        name="title"
        label="Title"
        value={form.title}
        onChange={form.setTitle}
        placeholder="Enter a title"
        maxLength={255}
        readOnly={readOnly}
      />

      <div className="flex flex-wrap gap-4">
        <Select
          label="Category"
          className="min-w-35 flex-1"
          value={form.categoryId}
          onChange={(value) => form.setCategoryId(value ? Number(value) : "")}
          options={categoryOptions(categories)}
          placeholder={{ value: "", label: "Select a category" }}
          firstItem={form.row ? undefined : { value: "", label: "None" }}
          readOnly={readOnly}
          readOnlyText={form.row?.category}
        />

        <DateInput
          label="Due Date"
          className="min-w-35 flex-1"
          value={form.dueDate}
          onChange={form.setDueDate}
          onValidityChange={form.setDateInvalid}
          readOnly={readOnly}
          readOnlyText={form.row ? formatDueDate(form.row) : ""}
        />

        {children}
      </div>

      <TextArea
        name="description"
        label="Description"
        value={form.description}
        onChange={form.setDescription}
        placeholder="Add more details"
        maxLength={1000}
        readOnly={readOnly}
        grow
      />
    </>
  );
}
