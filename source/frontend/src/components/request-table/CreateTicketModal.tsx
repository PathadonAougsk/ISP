"use client";
import { useState } from "react";
import { postTicket } from "@/lib/ticket";
import type { Category } from "@/lib/category";
import {
  DateField,
  FormButton,
  FormColumn,
  FormModal,
  SelectField,
  TextAreaField,
  TextField,
  useFormSubmit,
} from "@/components/request-table/FormParts";

export default function CreateTicketModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDueDate, setNewTicketDueDate] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [newTicketCategoryId, setNewTicketCategoryId] = useState<number | "">(
    "",
  );
  const { saving, error, setError, run } = useFormSubmit();

  async function handleCreateTicket(close: () => void) {
    if (!newTicketTitle.trim() || newTicketCategoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(
      () =>
        postTicket({
          name: newTicketTitle.trim(),
          description: newTicketDescription || null,
          category_id: newTicketCategoryId,
          due_date: newTicketDueDate || null,
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
          color="green"
          onClick={() => handleCreateTicket(close)}
          disabled={saving}
        >
          {saving ? "Submitting…" : "Submit"}
        </FormButton>
      )}
    >
      <FormColumn>
        <TextField
          label="Title"
          value={newTicketTitle}
          onChange={setNewTicketTitle}
          placeholder="Enter a title"
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Category"
            value={newTicketCategoryId}
            onChange={setNewTicketCategoryId}
            categories={categories}
          />
          <DateField
            label="Due Date"
            value={newTicketDueDate}
            onChange={setNewTicketDueDate}
          />
        </div>
        <TextAreaField
          label="Description"
          value={newTicketDescription}
          onChange={setNewTicketDescription}
          placeholder="Add more details"
        />
      </FormColumn>
    </FormModal>
  );
}
