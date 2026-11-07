"use client";
import type { TaskRow } from "@/lib/task";
import type { TaskStatus } from "@/lib/task";
import type { Category } from "@/lib/category";
import type { UserRole } from "@/lib/account";
import {
  formatDueDate,
  isPastDate,
  RequestListRow,
  RequestTableFrame,
} from "@/components/request-table/RequestList";

const titles = [
  "ID",
  "Title",
  "Category",
  "Status",
  "Assigned",
  "Created By",
  "Due Date",
  "Created Date",
  "Last Update",
];

// full class string, tailwind need to see it
const gridClassName = "grid-cols-[0.2fr_2fr_1.2fr_1fr_1.2fr_1.2fr_1fr_1fr_1fr]";

const statusOptions = [
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

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
  // The backend already limits a Lab User to their own tasks, so no extra filter here
  return (
    <RequestTableFrame
      title="Tasks"
      noun="tasks"
      rows={tasks}
      loading={loading}
      error={error}
      canCreate={userRole === "Lab Admin"}
      onCreate={onCreate}
      categories={categories}
      categoryId={categoryId}
      onCategoryChange={onCategoryChange}
      status={status}
      onStatusChange={(s) => onStatusChange(s as TaskStatus | "All")}
      statusOptions={statusOptions}
      page={page}
      hasNext={hasNext}
      onPageChange={onPageChange}
      titles={titles}
      gridClassName={gridClassName}
    >
      {(rows) =>
        rows.map((task) => {
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
                task.category,
                task.status,
                task.assignedTo,
                task.createdBy,
                formatDueDate(task),
                task.createdDate,
                task.lastUpdate,
              ]}
              onClick={() => onSelect(task)}
            />
          );
        })
      }
    </RequestTableFrame>
  );
}
