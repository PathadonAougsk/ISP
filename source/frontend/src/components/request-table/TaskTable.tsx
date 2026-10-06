"use client";
import { useState } from "react";
import { truncateLabel } from "@/lib/format";
import type { TaskRow } from "@/lib/task";
import type { UserRole } from "@/lib/account";

export default function TaskTable({
  tasks,
  loading,
  error,
  userRole,
  currentUserId,
  onSelect,
  onCreate,
}: {
  tasks: TaskRow[];
  loading: boolean;
  error: string | null;
  userRole: UserRole;
  currentUserId: string;
  onSelect: (task: TaskRow) => void;
  onCreate: () => void;
}) {
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("All");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");

  const taskCategories = Array.from(
    new Set(tasks.map((t) => t.category).filter(Boolean)),
  );

  const filteredTasks = tasks
    .filter(
      (task) =>
        task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        task.id.toLowerCase().includes(taskSearchTerm.toLowerCase()),
    )
    .filter((task) =>
      taskCategoryFilter === "All"
        ? true
        : task.category === taskCategoryFilter,
    )
    .filter((task) =>
      taskStatusFilter === "All" ? true : task.status === taskStatusFilter,
    )
    .filter((task) =>
      userRole === "Lab Admin"
        ? true
        : task.assigneeIds.includes(currentUserId),
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="h-9 text-lg font-semibold flex items-center gap-2">
          My Task
          {userRole === "Lab Admin" && (
            <button
              onClick={onCreate}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-(--primary-color-2) text-white text-2xl hover:bg-(--primary-color-2-hover)"
            >
              +
            </button>
          )}
        </h2>

        <div className="h-9 flex items-center gap-2">
          <input
            type="text"
            placeholder="Search"
            value={taskSearchTerm}
            onChange={(e) => setTaskSearchTerm(e.target.value)}
            className="h-9 border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          <select
            value={taskCategoryFilter}
            onChange={(e) => setTaskCategoryFilter(e.target.value)}
            className="h-9 max-w-[160px] truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="All">All</option>
            {taskCategories.map((category) => (
              <option key={category} value={category} title={category}>
                {truncateLabel(category)}
              </option>
            ))}
          </select>

          <select
            value={taskStatusFilter}
            onChange={(e) => setTaskStatusFilter(e.target.value)}
            className="h-9 max-w-[160px] truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="All">All</option>
            <option value="In_progress">In progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-(--primary-color-2) text-white text-left text-sm">
              <th className="px-4 py-2">Task-ID</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Assigned</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created By</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Created Date</th>
              <th className="px-4 py-2">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onSelect(task)}
                className="border-b border-gray-200 last:border-b-0 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3">{task.id}</td>
                <td
                  className="px-4 py-3 max-w-[160px] truncate"
                  title={task.title}
                >
                  {task.title}
                </td>
                <td
                  className="px-4 py-3 max-w-[200px] truncate"
                  title={task.description}
                >
                  {task.description}
                </td>
                <td
                  className="px-4 py-3 max-w-[100px] truncate"
                  title={task.category}
                >
                  {task.category}
                </td>
                <td
                  className="px-4 py-3 max-w-[140px] truncate"
                  title={task.assignedTo}
                >
                  {task.assignedTo}
                </td>
                <td className="px-4 py-3">{task.status}</td>
                <td
                  className="px-4 py-3 max-w-[120px] truncate"
                  title={task.createdBy}
                >
                  {task.createdBy}
                </td>
                <td className="px-4 py-3">{task.dueDate || "—"}</td>
                <td className="px-4 py-3">{task.createdDate}</td>
                <td className="px-4 py-3">{task.lastUpdate}</td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-6 text-center text-sm text-gray-400"
                >
                  Loading tasks…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-6 text-center text-sm text-red-500"
                >
                  Couldn't load tasks: {error}
                </td>
              </tr>
            )}
            {!loading && !error && filteredTasks.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-6 text-center text-sm text-gray-400"
                >
                  No tasks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
