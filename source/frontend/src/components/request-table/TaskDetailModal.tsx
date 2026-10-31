"use client";
import { useState } from "react";
import { putTask, type TaskRow } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { Member, UserRole } from "@/lib/account";
import { formatShortDate } from "@/lib/format";
import Icon from "@/components/icon";
import DateInput from "@/components/request-table/DateInput";
import {
  fieldClass,
  FormButton,
  FormField,
  FormFooter,
  FormHeader,
  ReadOnlyBox,
} from "@/components/request-table/FormParts";
import { SlideupFrame, useSlideupClose } from "@/components/modal_slideup";

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
  const { isClosing, handleClose } = useSlideupClose(onClose);
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
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskSubmitError, setTaskSubmitError] = useState<string | null>(null);

  function toggleEditTaskAssignAll() {
    setEditTaskAssignedIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id),
    );
  }

  function toggleEditTaskAssign(memberId: string) {
    setEditTaskAssignedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  async function handleSubmitTask() {
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await putTask(task.id, {
        name: task.title,
        description: task.description || null,
        status: "completed",
        category_id: task.categoryId,
        due_date: task.dueDateValue || null,
      });
      onSaved();
      handleClose();
    } catch (err) {
      setTaskSubmitError(
        err instanceof Error ? err.message : "Failed to submit task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUnsubmitTask() {
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await putTask(task.id, {
        name: task.title,
        description: task.description || null,
        status: "in_progress",
        category_id: task.categoryId,
        due_date: task.dueDateValue || null,
      });
      onSaved();
      handleClose();
    } catch (err) {
      setTaskSubmitError(
        err instanceof Error ? err.message : "Failed to unsubmit task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUpdateTask() {
    if (!editTaskTitle.trim() || editTaskCategoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await putTask(task.id, {
        name: editTaskTitle.trim(),
        description: editTaskDescription || null,
        status: task.status === "Completed" ? "completed" : "in_progress",
        category_id: editTaskCategoryId,
        due_date: editTaskDueDate || null,
        assignees: editTaskAssignedIds,
      });
      onSaved();
      handleClose();
    } catch (err) {
      setTaskSubmitError(
        err instanceof Error ? err.message : "Failed to update task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  return (
    <SlideupFrame isClosing={isClosing} onClose={handleClose}>
      <div className="flex flex-col h-full min-h-0">
        <FormHeader title="Task detail" onClose={handleClose} />

        <div className="flex gap-6 flex-1 min-h-0 overflow-y-auto">
          <div className="flex-1 space-y-4 min-w-0">
            <FormField label="Title">
              {userRole === "Lab Admin" ? (
                <input
                  type="text"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className={fieldClass}
                />
              ) : (
                <ReadOnlyBox>{task.title}</ReadOnlyBox>
              )}
            </FormField>

            <div className="flex gap-4">
              <FormField label="Category" className="flex-1 min-w-0">
                {userRole === "Lab Admin" ? (
                  <select
                    value={editTaskCategoryId}
                    onChange={(e) =>
                      setEditTaskCategoryId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <ReadOnlyBox>{task.category}</ReadOnlyBox>
                )}
              </FormField>
              <FormField label="Status" className="flex-1 min-w-0">
                <ReadOnlyBox>{task.status}</ReadOnlyBox>
              </FormField>
              <FormField label="Due Date" className="flex-1 min-w-0">
                {userRole === "Lab Admin" ? (
                  <DateInput
                    value={editTaskDueDate}
                    onChange={setEditTaskDueDate}
                    className={fieldClass}
                  />
                ) : (
                  <ReadOnlyBox>
                    {task.dueDateValue
                      ? formatShortDate(task.dueDateValue)
                      : task.dueDate || "—"}
                  </ReadOnlyBox>
                )}
              </FormField>
            </div>

            <FormField label="Created By">
              <ReadOnlyBox>{task.createdBy}</ReadOnlyBox>
            </FormField>

            <FormField label="Description">
              {userRole === "Lab Admin" ? (
                <textarea
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  className={`${fieldClass} min-h-24 max-h-40 overflow-y-auto`}
                />
              ) : (
                <ReadOnlyBox className="min-h-24 max-h-40!">
                  {task.description}
                </ReadOnlyBox>
              )}
            </FormField>

            {userRole !== "Lab Admin" && (
              <FormField label="Assigned">
                <ReadOnlyBox>{task.assignedTo || "—"}</ReadOnlyBox>
              </FormField>
            )}
          </div>

          {userRole === "Lab Admin" && (
            <div className="w-72 shrink-0 self-start rounded-[20px] bg-(--panel-bg) p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-base font-bold text-black">
                  Members{" "}
                  <span className="text-green-800">{members.length}</span>
                </p>
                <button
                  type="button"
                  onClick={toggleEditTaskAssignAll}
                  disabled={members.length === 0}
                  className="cursor-pointer rounded-full bg-(--primary-color-2) px-3 py-1 text-xs font-semibold text-white hover:bg-(--primary-color-2-hover) disabled:opacity-50"
                >
                  {members.length > 0 &&
                  editTaskAssignedIds.length === members.length
                    ? "Clear all"
                    : "Assign all"}
                </button>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
                {members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editTaskAssignedIds.includes(member.id)}
                      onChange={() => toggleEditTaskAssign(member.id)}
                      className="h-4 w-4 shrink-0 accent-(--primary-color-2)"
                    />
                    <Icon src="/profile.svg" className="h-6 w-auto shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium leading-tight text-gray-800">
                        {member.name}
                      </div>
                      <div className="truncate text-xs leading-tight text-gray-500">
                        {member.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <FormFooter error={taskSubmitError}>
          {userRole === "Lab Admin" && (
            <FormButton
              color="green"
              onClick={handleUpdateTask}
              disabled={isSavingTask}
            >
              {isSavingTask ? "Saving…" : "Save Changes"}
            </FormButton>
          )}

          {(userRole !== "Lab Admin" ||
            task.assigneeIds.includes(currentUserId)) &&
            (task.status === "Completed" ? (
              <FormButton
                color="red"
                onClick={handleUnsubmitTask}
                disabled={isSavingTask}
              >
                {isSavingTask ? "Saving…" : "Unsubmit"}
              </FormButton>
            ) : (
              <FormButton
                color="green"
                onClick={handleSubmitTask}
                disabled={isSavingTask}
              >
                {isSavingTask ? "Saving…" : "Submit"}
              </FormButton>
            ))}
        </FormFooter>
      </div>
    </SlideupFrame>
  );
}
