"use client";
import { useState } from "react";
import { postTask } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { Member } from "@/lib/account";
import {
  DateField,
  FormButton,
  FormColumn,
  FormModal,
  MemberPanel,
  SelectField,
  TextAreaField,
  TextField,
  useFormSubmit,
} from "@/components/request-table/FormParts";

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
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignedIds, setNewTaskAssignedIds] = useState<string[]>([]);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<number | "">("");
  const { saving, error, setError, run } = useFormSubmit();

  async function handleCreateTask(close: () => void) {
    if (!newTaskTitle.trim() || newTaskCategoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(
      () =>
        postTask({
          name: newTaskTitle.trim(),
          description: newTaskDescription || null,
          category_id: newTaskCategoryId,
          due_date: newTaskDueDate || null,
          assignees: newTaskAssignedIds,
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
          color="green"
          onClick={() => handleCreateTask(close)}
          disabled={saving}
        >
          {saving ? "Saving…" : "Submit"}
        </FormButton>
      )}
    >
      {/* Left column: form fields */}
      <FormColumn>
        <TextField
          label="Title"
          value={newTaskTitle}
          onChange={setNewTaskTitle}
        />
        <SelectField
          label="Category"
          value={newTaskCategoryId}
          onChange={setNewTaskCategoryId}
          categories={categories}
        />
        <DateField
          label="Due Date"
          value={newTaskDueDate}
          onChange={setNewTaskDueDate}
        />
        <TextAreaField
          label="Description"
          value={newTaskDescription}
          onChange={setNewTaskDescription}
        />
      </FormColumn>

      {/* Right column: assign members */}
      <MemberPanel
        members={members}
        selectedIds={newTaskAssignedIds}
        onChange={setNewTaskAssignedIds}
        loading={membersLoading}
        error={membersError ? "Couldn't load members" : null}
      />
    </FormModal>
  );
}
