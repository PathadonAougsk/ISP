"use client";

import { useState } from "react";
import { postTask } from "@/lib/task";
import { categoryOptions, type Category } from "@/lib/category";
import type { Member } from "@/lib/account";
import DateInput from "@/components/ui/date-input";
import { Select, TextArea, TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import MemberPanel from "@/components/request-table/MemberPanel";

export default function CreateTaskModal({
  categories,
  members,
  membersLoading,
  membersError,
  onClose,
  onCreated,
}: {
  categories: Category[];
  members: Member[];
  membersLoading: boolean;
  membersError: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const { saving, error, setError, run } = useFormSubmit();

  async function handleCreate(close: () => void) {
    if (!title.trim() || categoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(
      () =>
        postTask({
          name: title.trim(),
          description: description || null,
          category_id: categoryId,
          due_date: dueDate || null,
          assignees: assignedIds,
        }),
      "Failed to create task",
    );

    if (ok) {
      onCreated();
      close();
    }
  }

  return (
    <FormModal
      title="Create new task"
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
      {/* Left column: form fields */}
      <FormColumn>
        <TextInput
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Enter a title"
          maxLength={255}
        />
        <div className="flex gap-3">
          <div className="w-1/2">
            <Select
              label="Category"
              value={categoryId}
              onChange={(value) => setCategoryId(value ? Number(value) : "")}
              options={categoryOptions(categories)}
              placeholder={{ value: "", label: "Select a category" }}
              firstItem={{ value: "", label: "None" }}
            />
          </div>

          <div className="w-1/2">
            <DateInput label="Due Date" value={dueDate} onChange={setDueDate} />
          </div>
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

      {/* Right column: assign members */}
      <MemberPanel
        members={members}
        selectedIds={assignedIds}
        onChange={setAssignedIds}
        loading={membersLoading}
        error={membersError ? "Couldn't load members" : null}
      />
    </FormModal>
  );
}
