"use client";

import { useState, type FormEvent } from "react";
import {
  SlideupCloseButton,
  SlideupFrame,
  useSlideupClose,
} from "@/components/modal_slideup";
import type { CreateAnnouncementInput } from "@/lib/announcement";

export default function CreateAnnouncementModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateAnnouncementInput) => Promise<void>;
}) {
  const { isClosing, handleClose } = useSlideupClose(onClose);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    // TODO: better validation
    if (!name.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({ name: name.trim(), description: description.trim() });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <SlideupFrame isClosing={isClosing} onClose={handleClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Create New Announcement</h2>
        <SlideupCloseButton onClose={handleClose} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex h-[calc(100%-3rem)] flex-col gap-4">
        <div className="flex gap-6">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium">
            Title
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              className="rounded-full bg-gray-200 px-4 py-2 text-sm font-normal outline-none"
            />
          </label>

          {/* TODO: lab not in model yet, disabled for now */}
          <label className="flex w-1/4 flex-col gap-1 text-xs font-medium">
            Lab
            <select
              disabled
              className="rounded-full bg-gray-200 px-4 py-2 text-sm font-normal text-gray-500 outline-none"
            >
              <option>Coming soon</option>
            </select>
          </label>
        </div>

        <label className="flex min-h-0 flex-1 flex-col gap-1 text-xs font-medium">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 resize-none rounded-3xl bg-gray-200 p-4 text-sm font-normal outline-none"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-gray-200 px-10 py-3 text-sm font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gray-600 px-10 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </form>
    </SlideupFrame>
  );
}
