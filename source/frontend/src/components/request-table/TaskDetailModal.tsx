"use client";

import { useState } from "react";
import { putTask, type TaskRow } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { Member, UserRole } from "@/lib/account";
import { formatDueDate } from "@/components/request-table/RequestList";
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
  const [editTaskTitle, setEditTaskTitle] = useState(task.title);
  const [editTaskCategoryId, setEditTaskCategoryId] = useState<number | "">(
    task.categoryId,
  );
  const [editTaskDescription, setEditTaskDescription] = useState(
    task.description,
  );
  const [editTaskDueDate, setEditTaskDueDate] = useState(task.dueDateValue);
  const [editTaskAssignedIds, setEditTaskAssignedIds] = useState<string[]>(
    task.assigneeIds,
  );
  const { saving, error, setError, run } = useFormSubmit();

  const isAdmin = userRole === "Lab Admin";

  const hasChanges =
    editTaskTitle.trim() !== task.title ||
    editTaskCategoryId !== task.categoryId ||
    (editTaskDescription || "") !== (task.description || "") ||
    (editTaskDueDate || "") !== (task.dueDateValue || "") ||
    JSON.stringify([...editTaskAssignedIds].sort()) !==
      JSON.stringify([...task.assigneeIds].sort());

  // Submit and unsubmit only flip the status; other fields stay as saved.
  async function handleSetStatus(
    status: "completed" | "in_progress",
    close: () => void,
  ) {
    const ok = await run(
      () =>
        putTask(task.id, {
          name: task.title,
          description: task.description || null,
          status,
          category_id: task.categoryId,
          due_date: task.dueDateValue || null,
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

  async function handleUpdateTask(close: () => void) {
    if (!hasChanges) return;

    if (!editTaskTitle.trim() || editTaskCategoryId === "") {
      setError("Title and category are required.");
      return;
    }

    const ok = await run(
      () =>
        putTask(task.id, {
          name: editTaskTitle.trim(),
          description: editTaskDescription || null,
          status: task.status === "Completed" ? "completed" : "in_progress",
          category_id: editTaskCategoryId,
          due_date: editTaskDueDate || null,
          assignees: editTaskAssignedIds,
        }),
      "Failed to update task",
    );

    if (ok) {
      onSaved();
      close();
    }
  }

  return (
    <FormModal
      title="Task detail"
      onClose={onClose}
      error={error}
      footer={(close) => (
        <>
          {isAdmin && (
            <FormButton
              color="green"
              onClick={() => handleUpdateTask(close)}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving…" : "Save Changes"}
            </FormButton>
          )}

          {(!isAdmin || task.assigneeIds.includes(currentUserId)) &&
            (task.status === "Completed" ? (
              <FormButton
                color="red"
                onClick={() => handleSetStatus("in_progress", close)}
                disabled={saving}
              >
                {saving ? "Saving…" : "Unsubmit"}
              </FormButton>
            ) : (
              <FormButton
                color="green"
                onClick={() => handleSetStatus("completed", close)}
                disabled={saving}
              >
                {saving ? "Saving…" : "Submit"}
              </FormButton>
            ))}
        </>
      )}
    >
      <FormColumn>
        <TextField
          label="Title"
          value={editTaskTitle}
          onChange={setEditTaskTitle}
          placeholder="Enter a title"
          readOnly={!isAdmin}
        />

        <div className="flex gap-4">
          <SelectField
            label="Category"
            className="flex-1 min-w-0"
            value={editTaskCategoryId}
            onChange={setEditTaskCategoryId}
            categories={categories}
            readOnly={!isAdmin}
            readOnlyText={task.category}
          />

          <TextField
            label="Status"
            className="flex-1 min-w-0"
            value={task.status}
            readOnly
          />
        </div>

        <div className="flex gap-4">
          <TextField
            label="Created By"
            className="flex-1 min-w-0"
            value={task.createdBy}
            readOnly
          />

          <DateField
            label="Due Date"
            className="flex-1 min-w-0"
            value={editTaskDueDate}
            onChange={setEditTaskDueDate}
            readOnly={!isAdmin}
            readOnlyText={formatDueDate(task)}
          />
        </div>

        <TextAreaField
          label="Description"
          value={editTaskDescription}
          onChange={setEditTaskDescription}
          placeholder="Add more details"
          readOnly={!isAdmin}
        />

        {!isAdmin && (
          <TextField
            label="Assigned"
            value={task.assignedTo || "Unassigned"}
            readOnly
          />
        )}
      </FormColumn>

      {isAdmin && (
        <MemberPanel
          members={members}
          selectedIds={editTaskAssignedIds}
          onChange={setEditTaskAssignedIds}
        />
      )}
    </FormModal>
  );
}
