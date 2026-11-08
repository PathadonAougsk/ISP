"use client";

import { useState } from "react";
import type { Announcement, CreateAnnouncementInput } from "@/lib/announcement";
import {
  FormButton,
  FormColumn,
  FormModal,
  TextAreaField,
  TextField,
  useFormSubmit,
} from "@/components/request-table/FormParts";

export default function CreateAnnouncementModal({
  announcement,
  onClose,
  onSubmit,
}: {
  announcement?: Announcement;
  onClose: () => void;
  onSubmit: (input: CreateAnnouncementInput) => Promise<void>;
}) {
  // announcement given = edit mode, prefill
  const [name, setName] = useState(announcement?.name ?? "");
  const [description, setDescription] = useState(
    announcement?.description ?? "",
  );
  const { saving, error, setError, run } = useFormSubmit();

  async function handleCreate(close: () => void) {
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
      title={announcement ? "Edit announcement" : "Create new announcement"}
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
