"use client";

import { useState } from "react";
import { putTask, type TaskRow } from "@/lib/task";
import { categoryOptions, type Category } from "@/lib/category";
import type { Member, UserRole } from "@/lib/account";
import DateInput from "@/components/ui/date-input";
import { Select, TextArea, TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import MemberPanel from "@/components/request-table/MemberPanel";
import { formatDueDate } from "@/components/request-table/RequestList";

export default function TaskDetailModal({
  task,
  userRole,
  currentUserId,
  members,
  categories,
  onClose,
  onSaved,
}: {
  task: TaskRow;
  userRole: UserRole;
  currentUserId: string;
  members: Member[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [categoryId, setCategoryId] = useState<number | "">(task.categoryId);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDateValue);
  const [assignedIds, setAssignedIds] = useState<string[]>(task.assigneeIds);
  const { saving, error, setError, run } = useFormSubmit();
  const [action, setAction] = useState<"update" | "status" | null>(null);

  const isAdmin = userRole === "Lab Admin";

  // The date input only holds a day, so sending it back would drop the time
  // the backend stored. Send the saved value instead unless it was edited.
  const dueDateChanged = (dueDate || "") !== (task.dueDateValue || "");
  const dueDatePayload = dueDateChanged ? dueDate || null : task.dueDateIso;

  const hasChanges =
    title.trim() !== task.title ||
    categoryId !== task.categoryId ||
    (description || "") !== (task.description || "") ||
    dueDateChanged ||
    JSON.stringify([...assignedIds].sort()) !==
      JSON.stringify([...task.assigneeIds].sort());

  // Submit and unsubmit only flip the status; other fields stay as saved.
  async function handleSetStatus(
    status: "completed" | "in_progress",
    close: () => void,
  ) {
    setAction("status");
    const ok = await run(
      () =>
        putTask(task.id, {
          name: task.title,
          description: task.description || null,
          status,
          category_id: task.categoryId,
          due_date: task.dueDateIso,
        }),
      status === "completed"
        ? "Failed to submit task"
        : "Failed to unsubmit task",
    );

    if (ok) {
      onSaved();
      close();
    }
  }

  async function handleUpdate(close: () => void) {
    if (!hasChanges) return;

    if (!title.trim() || categoryId === "") {
      setError("Title and category are required.");
      return;
    }

    setAction("update");
    const ok = await run(
      () =>
        putTask(task.id, {
          name: title.trim(),
          description: description || null,
          status: task.status === "Completed" ? "completed" : "in_progress",
          category_id: categoryId,
          due_date: dueDatePayload,
          assignees: assignedIds,
        }),
      "Failed to update task",
    );

    if (ok) {
      onSaved();
      close();
    }
  }

  const completed = task.status === "Completed";

  return (
    <FormModal
      title="Task detail"
      id={task.id}
      onClose={onClose}
      error={error}
      footer={(close) => (
        <>
          {isAdmin && (
            <FormButton
              variant="green"
              onClick={() => handleUpdate(close)}
              disabled={saving || !hasChanges}
            >
              {saving && action === "update" ? "Saving…" : "Save"}
            </FormButton>
          )}

          {(!isAdmin || task.assigneeIds.includes(currentUserId)) && (
            <FormButton
              variant={completed ? "red" : "green"}
              onClick={() =>
                handleSetStatus(completed ? "in_progress" : "completed", close)
              }
              disabled={saving}
            >
              {saving && action === "status"
                ? completed
                  ? "Unsubmitting…"
                  : "Submitting…"
                : completed
                  ? "Unsubmit"
                  : "Submit"}
            </FormButton>
          )}
        </>
      )}
    >
      <FormColumn>
        <TextInput
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Enter a title"
          maxLength={255}
          readOnly={!isAdmin}
        />

        <div className="flex gap-4">
          <Select
            label="Category"
            className="min-w-0 flex-1"
            value={categoryId}
            onChange={(value) => setCategoryId(value ? Number(value) : "")}
            options={categoryOptions(categories)}
            placeholder={{ value: "", label: "Select a category" }}
            readOnly={!isAdmin}
            readOnlyText={task.category}
          />

          <TextInput
            label="Status"
            className="min-w-0 flex-1"
            value={task.status}
            readOnly
          />
        </div>

        <div className="flex gap-4">
          <TextInput
            label="Created By"
            className="min-w-0 flex-1"
            value={task.createdBy}
            readOnly
          />

          <DateInput
            label="Due Date"
            className="min-w-0 flex-1"
            value={dueDate}
            onChange={setDueDate}
            readOnly={!isAdmin}
            readOnlyText={formatDueDate(task)}
          />
        </div>

        <TextArea
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Add more details"
          maxLength={1000}
          readOnly={!isAdmin}
          grow
        />

        {!isAdmin && (
          <TextInput
            label="Assigned"
            value={task.assignedTo || "Unassigned"}
            readOnly
          />
        )}
      </FormColumn>

      {isAdmin && (
        <MemberPanel
          members={members}
          selectedIds={assignedIds}
          onChange={setAssignedIds}
        />
      )}
    </FormModal>
  );
}
