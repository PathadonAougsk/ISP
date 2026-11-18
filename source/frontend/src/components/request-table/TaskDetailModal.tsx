"use client";

import { useState } from "react";
import { putTask, type TaskRow } from "@/lib/task";
import type { Category } from "@/lib/category";
import { isAdminRole, type AccountRole, type Member } from "@/lib/account";
import { TextInput } from "@/components/ui/field";
import {
  FormButton,
  FormColumn,
  FormModal,
  useFormSubmit,
} from "@/components/ui/form-modal";
import MemberPanel from "@/components/request-table/MemberPanel";
import {
  REQUIRED_MESSAGE,
  RequestFields,
  useRequestForm,
} from "@/components/request-table/RequestForm";

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
  userRole: AccountRole;
  currentUserId: string;
  members: Member[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useRequestForm(task);
  const [assignedIds, setAssignedIds] = useState<string[]>(task.assigneeIds);
  const { saving, error, setError, run } = useFormSubmit();
  const [action, setAction] = useState<"update" | "status" | null>(null);

  const isAdmin = isAdminRole(userRole);

  const hasChanges =
    form.hasChanges ||
    JSON.stringify([...assignedIds].sort()) !==
      JSON.stringify([...task.assigneeIds].sort());

  // One PUT for edits and status, so it all save or nothing save.
  // Not admin or nothing edited: only the status go.
  async function save(
    status: "completed" | "in_progress",
    nextAction: "update" | "status",
    close: () => void,
  ) {
    const edits = isAdmin && hasChanges;
    const values = form.values;
    if (edits && !values) {
      setError(REQUIRED_MESSAGE);
      return;
    }

    setAction(nextAction);
    const ok = await run(
      () =>
        putTask(
          task.id,
          edits ? { ...values, status, assignees: assignedIds } : { status },
        ),
      nextAction === "update"
        ? "Failed to update task"
        : status === "completed"
          ? "Failed to submit task"
          : "Failed to unsubmit task",
    );

    if (ok) {
      onSaved();
      close();
    }
  }

  const completed = task.status === "Completed";
  const status = completed ? "completed" : "in_progress";

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
              onClick={() => save(status, "update", close)}
              disabled={saving || !hasChanges || form.dateInvalid}
            >
              {saving && action === "update" ? "Saving…" : "Save"}
            </FormButton>
          )}

          {task.assigneeIds.includes(currentUserId) && (
            <FormButton
              variant={completed ? "red" : "green"}
              onClick={() =>
                save(completed ? "in_progress" : "completed", "status", close)
              }
              disabled={saving || form.dateInvalid}
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
        <RequestFields form={form} categories={categories} readOnly={!isAdmin}>
          <TextInput
            name="created_by"
            label="Created By"
            className="min-w-35 flex-1"
            value={task.createdBy}
            readOnly
          />

          <TextInput
            name="status"
            label="Status"
            className="min-w-35 flex-1"
            value={task.status}
            readOnly
          />
        </RequestFields>

        {!isAdmin && (
          <TextInput
            name="assigned"
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
