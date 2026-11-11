"use client";

import { useState } from "react";
import type { Announcement, CreateAnnouncementInput } from "@/lib/announcement";
import { TextArea, TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";

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

  async function handleSubmit(close: () => void) {
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
          variant="green"
          onClick={() => handleSubmit(close)}
          disabled={saving}
        >
          {saving ? "Saving…" : "Submit"}
        </FormButton>
      )}
    >
      <FormColumn>
        <TextInput
          label="Title"
          value={name}
          onChange={setName}
          placeholder="Enter a title"
          maxLength={255}
        />
        <TextArea
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Add more details"
          grow
        />
      </FormColumn>
    </FormModal>
  );
}
