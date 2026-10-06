"use client";
import { useState } from "react";
import { postTask } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { Member } from "@/lib/account";

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
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskSubmitError, setTaskSubmitError] = useState<string | null>(null);

  function toggleNewTaskAssignAll() {
    setNewTaskAssignedIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id),
    );
  }

  function toggleNewTaskAssign(memberId: string) {
    setNewTaskAssignedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || newTaskCategoryId === "") {
      setTaskSubmitError("Title and category are required.");
      return;
    }
    setIsSavingTask(true);
    setTaskSubmitError(null);
    try {
      await postTask({
        name: newTaskTitle.trim(),
        description: newTaskDescription || null,
        category_id: newTaskCategoryId,
        due_date: newTaskDueDate || null,
        assignees: newTaskAssignedIds,
      });
      onCreated();
      resetTaskForm();
    } catch (err) {
      setTaskSubmitError(
        err instanceof Error ? err.message : "Failed to create task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  function resetTaskForm() {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskAssignedIds([]);
    setNewTaskDueDate("");
    setNewTaskCategoryId("");
    setTaskSubmitError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 min-h-[75vh] max-h-[85vh] overflow-y-auto flex flex-col">
        <div className="bg-(--primary-color-2) text-white text-center py-3 rounded-t-lg font-semibold">
          Create new tasks
        </div>

        <div className="flex gap-6 p-6 flex-1">
          {/* Left column: form fields */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={newTaskCategoryId}
                onChange={(e) =>
                  setNewTaskCategoryId(
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full bg-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="w-full bg-gray-100 rounded px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* Right column: assign members */}
          <div className="w-64 border-l border-gray-200 pl-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase mb-2 pb-2 border-b border-gray-200">
              <span>Members — {members.length}</span>
              <button
                type="button"
                onClick={toggleNewTaskAssignAll}
                disabled={members.length === 0}
                className="px-3 py-1 rounded-full bg-(--primary-color-2) text-white normal-case hover:bg-(--primary-color-2-hover) disabled:opacity-50"
              >
                {members.length > 0 &&
                newTaskAssignedIds.length === members.length
                  ? "Clear all"
                  : "Assign all"}
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {membersLoading && (
                <div className="text-xs text-gray-400">Loading members…</div>
              )}
              {membersError && !membersLoading && (
                <div className="text-xs text-red-500">
                  Couldn't load members
                </div>
              )}
              {!membersLoading &&
                !membersError &&
                members.map((member) => (
                  <label
                    key={member.id}
                    className="grid grid-cols-[auto_1fr] gap-x-3 items-center"
                  >
                    <input
                      type="checkbox"
                      checked={newTaskAssignedIds.includes(member.id)}
                      onChange={() => toggleNewTaskAssign(member.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
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
        </div>

        {/* Footer: action buttons, bottom-right */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 items-center">
          {taskSubmitError && (
            <span className="text-sm text-red-500 mr-auto">
              {taskSubmitError}
            </span>
          )}
          <button
            onClick={resetTaskForm}
            disabled={isSavingTask}
            className="px-5 py-2 rounded bg-(--primary-red) hover:bg-(--primary-red-hover) text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTask}
            disabled={isSavingTask}
            className="px-5 py-2 rounded bg-(--primary-color-3) text-black hover:bg-(--primary-color-3-hover) text-sm disabled:opacity-50"
          >
            {isSavingTask ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
