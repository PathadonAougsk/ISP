"use client";
import { useState } from "react";
import { postTask } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { Member } from "@/lib/account";
import Icon from "@/components/icon";
import DateInput from "@/components/request-table/DateInput";
import {
  fieldClass,
  FormButton,
  FormField,
  FormFooter,
  FormHeader,
} from "@/components/request-table/FormParts";
import { SlideupFrame, useSlideupClose } from "@/components/modal_slideup";

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
  const { isClosing, handleClose } = useSlideupClose(onClose);
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
    handleClose();
  }

  return (
    <SlideupFrame isClosing={isClosing} onClose={handleClose}>
      <div className="flex flex-col h-full min-h-0">
        <FormHeader title="Create new task" onClose={handleClose} />

        <div className="flex gap-6 flex-1 min-h-0 overflow-y-auto">
          {/* Left column: form fields */}
          <div className="flex-1 space-y-4">
            <FormField label="Title">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className={fieldClass}
              />
            </FormField>

            <FormField label="Category">
              <select
                value={newTaskCategoryId}
                onChange={(e) =>
                  setNewTaskCategoryId(
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
            </FormField>

            <FormField label="Due Date">
              <DateInput
                value={newTaskDueDate}
                onChange={setNewTaskDueDate}
                className={fieldClass}
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className={`${fieldClass} min-h-24`}
              />
            </FormField>
          </div>

          {/* Right column: assign members */}
          <div className="w-72 shrink-0 self-start rounded-[20px] bg-(--panel-bg) p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-bold text-black">
                Members <span className="text-green-800">{members.length}</span>
              </p>
              <button
                type="button"
                onClick={toggleNewTaskAssignAll}
                disabled={members.length === 0}
                className="cursor-pointer rounded-full bg-(--primary-color-2) px-3 py-1 text-xs font-semibold text-white hover:bg-(--primary-color-2-hover) disabled:opacity-50"
              >
                {members.length > 0 &&
                newTaskAssignedIds.length === members.length
                  ? "Clear all"
                  : "Assign all"}
              </button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
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
                  <label key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTaskAssignedIds.includes(member.id)}
                      onChange={() => toggleNewTaskAssign(member.id)}
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
        </div>

        <FormFooter error={taskSubmitError}>
          <FormButton
            color="green"
            onClick={handleCreateTask}
            disabled={isSavingTask}
          >
            {isSavingTask ? "Saving…" : "Submit"}
          </FormButton>
        </FormFooter>
      </div>
    </SlideupFrame>
  );
}
