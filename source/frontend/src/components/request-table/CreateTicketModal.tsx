"use client";

import { useState } from "react";
import { postTicket } from "@/lib/ticket";
import { categoryOptions, type Category } from "@/lib/category";
import DateInput from "@/components/ui/date-input";
import { Select, TextArea, TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";

export default function CreateTicketModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const { saving, error, setError, run } = useFormSubmit();

  async function handleCreate(close: () => void) {
    if (!title.trim() || categoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(
      () =>
        postTicket({
          name: title.trim(),
          description: description || null,
          category_id: categoryId,
          due_date: dueDate || null,
        }),
      "Failed to create ticket",
    );

    if (ok) {
      onCreated();
      close();
    }
  }

  return (
    <FormModal
      title="Create new ticket"
      onClose={onClose}
      error={error}
      footer={(close) => (
        <FormButton
          variant="green"
          onClick={() => handleCreate(close)}
          disabled={saving}
        >
          {saving ? "Creating…" : "Create"}
        </FormButton>
      )}
    >
      <FormColumn>
        <TextInput
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Enter a title"
          maxLength={255}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            value={categoryId}
            onChange={(value) => setCategoryId(value ? Number(value) : "")}
            options={categoryOptions(categories)}
            placeholder={{ value: "", label: "Select a category" }}
            firstItem={{ value: "", label: "None"}}
          />
          <DateInput label="Due Date" value={dueDate} onChange={setDueDate} />
        </div>
        <TextArea
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Add more details"
          maxLength={1000}
          grow
        />
      </FormColumn>
    </FormModal>
  );
}
