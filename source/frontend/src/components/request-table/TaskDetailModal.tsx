"use client";
import { useState } from "react";
import { putTask, type TaskRow } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { Member, UserRole } from "@/lib/account";
import DateInput from "@/components/request-table/DateInput";

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
      onClose();
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
      onClose();
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
      onClose();
    } catch (err) {
      setTaskSubmitError(
        err instanceof Error ? err.message : "Failed to update task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] max-h-[85vh] overflow-y-auto flex flex-col">
        <div className="bg-(--primary-color-2) text-white text-center py-3 rounded-t-lg font-semibold">
          Task detail
        </div>

        <div className="flex gap-6 p-6 flex-1">
          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              {userRole === "Lab Admin" ? (
                <input
                  type="text"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              ) : (
                <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                  {task.title}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                {userRole === "Lab Admin" ? (
                  <select
                    value={editTaskCategoryId}
                    onChange={(e) =>
                      setEditTaskCategoryId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                    {task.category}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-1">Status</label>
                <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                  {task.status}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-1">
                  Due Date
                </label>
                {userRole === "Lab Admin" ? (
                  <DateInput
                    value={editTaskDueDate}
                    onChange={setEditTaskDueDate}
                    className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                    {task.dueDate || "—"}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Created By
              </label>
              <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word">
                {task.createdBy}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              {userRole === "Lab Admin" ? (
                <textarea
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  className="w-full bg-gray-100 rounded px-3 py-2 text-sm min-h-24 max-h-40 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              ) : (
                <div className="bg-gray-100 rounded px-3 py-2 text-sm min-h-24 max-h-40 overflow-y-auto wrap-break-word">
                  {task.description}
                </div>
              )}
            </div>

            {userRole !== "Lab Admin" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Assigned
                </label>
                <div className="bg-gray-100 rounded px-3 py-2 text-sm wrap-break-word max-h-20 overflow-y-auto">
                  {task.assignedTo || "—"}
                </div>
              </div>
            )}
          </div>

          {userRole === "Lab Admin" && (
            <div className="w-64 border-l border-gray-200 pl-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
                <span>Members — {members.length}</span>
                <button
                  type="button"
                  onClick={toggleEditTaskAssignAll}
                  disabled={members.length === 0}
                  className="px-3 py-1 rounded-full bg-(--primary-color-2) text-white normal-case hover:bg-(--primary-color-2-hover) disabled:opacity-50"
                >
                  {members.length > 0 &&
                  editTaskAssignedIds.length === members.length
                    ? "Clear all"
                    : "Assign all"}
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="grid grid-cols-[auto_1fr] gap-x-3 items-center"
                  >
                    <input
                      type="checkbox"
                      checked={editTaskAssignedIds.includes(member.id)}
                      onChange={() => toggleEditTaskAssign(member.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0" />
                      <div>
                        <div className="text-sm font-medium leading-tight">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-400 leading-tight">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 items-center">
          {taskSubmitError && (
            <span className="text-sm text-red-500 mr-auto">
              {taskSubmitError}
            </span>
          )}

          <button
            onClick={() => {
              setTaskSubmitError(null);
              onClose();
            }}
            disabled={isSavingTask}
            className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50"
          >
            Cancel
          </button>

          {userRole === "Lab Admin" && (
            <button
              onClick={handleUpdateTask}
              disabled={isSavingTask}
              className="px-5 py-2 rounded bg-(--primary-color-2) text-black hover:bg-(--primary-color-2-hover) text-sm disabled:opacity-50"
            >
              {isSavingTask ? "Saving…" : "Save Changes"}
            </button>
          )}

          {(userRole !== "Lab Admin" ||
            task.assigneeIds.includes(currentUserId)) &&
            (task.status === "Completed" ? (
              <button
                onClick={handleUnsubmitTask}
                disabled={isSavingTask}
                className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50"
              >
                {isSavingTask ? "Saving…" : "Unsubmit"}
              </button>
            ) : (
              <button
                onClick={handleSubmitTask}
                disabled={isSavingTask}
                className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-(--primary-color-3-hover) text-sm disabled:opacity-50"
              >
                {isSavingTask ? "Saving…" : "Submit"}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
