"use client";
import { useState } from "react";
import type { TaskRow } from "@/lib/task";
import type { TaskStatus } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { UserRole } from "@/lib/account";
import { ListMessage } from "@/components/dashboard/dashboard_utils";
import Pagination from "@/components/request-table/Pagination";
import {
  isPastDate,
  RequestListHeader,
  RequestListRow,
} from "@/components/request-table/RequestList";
import { formatShortDate, truncateLabel } from "@/lib/format";

const titles = [
  "Task-ID",
  "Title",
  "Description",
  "Category",
  "Assigned",
  "Status",
  "Created By",
  "Due Date",
  "Created Date",
  "Last Update",
];

// full class string, tailwind need to see it
const gridClassName =
  "grid-cols-[0.6fr_1.6fr_1.8fr_1.2fr_1.4fr_1fr_1.2fr_1fr_1fr_1fr]";

const controlClass =
  "h-9 rounded-full bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color-2)";

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
    <div className="rounded-[30px] bg-(--panel-bg) p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="h-9 text-lg font-semibold flex items-center gap-2">
          Tasks
          {userRole === "Lab Admin" && (
            <button
              onClick={onCreate}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-(--primary-color-2) text-white text-2xl hover:bg-(--primary-color-2-hover)"
            >
              +
            </button>
          )}
        </h1>

        <div className="h-9 flex items-center gap-2">
          <input
            type="text"
            placeholder="Search this page"
            value={taskSearchTerm}
            onChange={(e) => setTaskSearchTerm(e.target.value)}
            className={controlClass}
          />

          <select
            value={categoryId}
            onChange={(e) =>
              onCategoryChange(
                e.target.value === "All" ? "All" : Number(e.target.value),
              )
            }
            className={`${controlClass} max-w-40 truncate`}
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
            className={`${controlClass} max-w-40 truncate`}
          >
            <option value="All">All</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <RequestListHeader titles={titles} gridClassName={gridClassName} />

        {filteredTasks.map((task) => {
          const completed = task.status === "Completed";
          // only unfinished task can be overdue
          const overdue = !completed && isPastDate(task.dueDateValue);

          return (
            <RequestListRow
              key={task.id}
              overdue={overdue}
              spacingClassName="pl-2.5 pr-3.5 gap-6"
              gridClassName={gridClassName}
              lead={
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    overdue
                      ? "bg-(--primary-red)"
                      : completed
                        ? "bg-(--primary-color-1)"
                        : "bg-(--primary-blue)"
                  }`}
                />
              }
              cells={[
                task.id,
                task.title,
                task.description,
                task.category,
                task.assignedTo,
                task.status,
                task.createdBy,
                task.dueDateValue
                  ? formatShortDate(task.dueDateValue)
                  : task.dueDate || "—",
                task.createdDate,
                task.lastUpdate,
              ]}
              onClick={() => onSelect(task)}
            />
          );
        })}

        {loading && tasks.length === 0 && (
          <ListMessage>Loading tasks…</ListMessage>
        )}
        {error && !loading && (
          <ListMessage>Couldn't load tasks: {error}</ListMessage>
        )}
        {!loading && !error && filteredTasks.length === 0 && (
          <ListMessage>No tasks yet.</ListMessage>
        )}
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
