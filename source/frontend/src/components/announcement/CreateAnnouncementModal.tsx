"use client";

import { useState } from "react";
import type { CreateAnnouncementInput } from "@/lib/announcement";
import {
  FormButton,
  FormColumn,
  FormModal,
  TextAreaField,
  TextField,
  useFormSubmit,
} from "@/components/request-table/FormParts";

export default function CreateAnnouncementModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateAnnouncementInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { saving, error, setError, run } = useFormSubmit();

  async function handleCreate(close: () => void) {
    // TODO: better validation
    if (!name.trim()) {
      setError("Title is required.");
      return;
    }

    const ok = await run(
      () => onSubmit({ name: name.trim(), description: description.trim() }),
      "Something went wrong.",
    );

    if (ok) close();
  }

  return (
    <FormModal
      title="Create new announcement"
      onClose={onClose}
      error={error}
      footer={(close) => (
        <FormButton
          color="green"
          onClick={() => handleCreate(close)}
          disabled={saving}
        >
          {saving ? "Saving…" : "Submit"}
        </FormButton>
      )}
    >
      <FormColumn>
        <TextField
          label="Title"
          value={name}
          onChange={setName}
          placeholder="Enter a title"
          maxLength={255}
        />
        <TextAreaField
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Add more details"
        />
      </FormColumn>
    </FormModal>
  );
}
