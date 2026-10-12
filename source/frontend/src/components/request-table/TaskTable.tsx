"use client";
import { useState } from "react";
import type { TaskRow } from "@/lib/task";
import type { TaskStatus } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { UserRole } from "@/lib/account";
import Pagination from "@/components/request-table/Pagination";
import { truncateLabel } from "@/lib/format";

export default function TaskTable({
  tasks,
  loading,
  error,
  userRole,
  categories,
  status,
  onStatusChange,
  categoryId,
  onCategoryChange,
  page,
  hasNext,
  onPageChange,
  onSelect,
  onCreate,
}: {
  tasks: TaskRow[];
  loading: boolean;
  error: string | null;
  userRole: UserRole;
  categories: Category[];
  status: TaskStatus | "All";
  onStatusChange: (status: TaskStatus | "All") => void;
  categoryId: number | "All";
  onCategoryChange: (id: number | "All") => void;
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  onSelect: (task: TaskRow) => void;
  onCreate: () => void;
}) {
  // Search only looks at the rows on the current page
  const [taskSearchTerm, setTaskSearchTerm] = useState("");

  // The backend already limits a Lab User to their own tasks, so no extra filter here
  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.id.toLowerCase().includes(taskSearchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="h-9 text-lg font-semibold flex items-center gap-2">
          Tasks
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
            placeholder="Search this page"
            value={taskSearchTerm}
            onChange={(e) => setTaskSearchTerm(e.target.value)}
            className="h-9 border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          <select
            value={categoryId}
            onChange={(e) =>
              onCategoryChange(
                e.target.value === "All" ? "All" : Number(e.target.value),
              )
            }
            className="h-9 max-w-40 truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="All">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} title={c.name}>
                {truncateLabel(c.name)}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) =>
              onStatusChange(e.target.value as TaskStatus | "All")
            }
            className="h-9 max-w-40 truncate border border-gray-300 rounded-full px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="All">All</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
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
                <td className="px-4 py-3 max-w-40 truncate" title={task.title}>
                  {task.title}
                </td>
                <td
                  className="px-4 py-3 max-w-50 truncate"
                  title={task.description}
                >
                  {task.description}
                </td>
                <td
                  className="px-4 py-3 max-w-25 truncate"
                  title={task.category}
                >
                  {task.category}
                </td>
                <td
                  className="px-4 py-3 max-w-35 truncate"
                  title={task.assignedTo}
                >
                  {task.assignedTo}
                </td>
                <td className="px-4 py-3">{task.status}</td>
                <td
                  className="px-4 py-3 max-w-30 truncate"
                  title={task.createdBy}
                >
                  {task.createdBy}
                </td>
                <td className="px-4 py-3">{task.dueDate || "—"}</td>
                <td className="px-4 py-3">{task.createdDate}</td>
                <td className="px-4 py-3">{task.lastUpdate}</td>
              </tr>
            ))}
            {loading && tasks.length === 0 && (
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
      <Pagination
        page={page}
        hasNext={hasNext}
        loading={loading}
        onChange={onPageChange}
      />
    </div>
  );
}
