"use client";

import type { TaskRow } from "@/lib/task";
import { isMissingItem } from "@/components/dashboard/dashboard-data";
import {
  formatDueDate,
  RequestTableFrame,
  type TableProps,
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
const gridClassName =
  "grid-cols-[0.2fr_1.2fr_0.67fr_0.67fr_0.67fr_0.8fr_0.8fr_1fr_1fr]";

const statusOptions = [
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export default function TaskTable(props: TableProps<TaskRow>) {
  // The backend already limits a Lab User to their own tasks, so no extra filter here
  const now = new Date();

  return (
    <RequestTableFrame
      {...props}
      title="Tasks"
      noun="tasks"
      statusOptions={statusOptions}
      titles={titles}
      gridClassName={gridClassName}
      getRow={(task) => {
        const completed = task.status === "Completed";
        // same rule as dashboard: in progress + deadline passed
        const overdue = isMissingItem(
          { status: task.status, due_date: task.dueDateIso },
          ["In progress"],
          now,
        );

        return {
          overdue,
          spacingClassName: "pl-2.5 pr-3.5 gap-6",
          lead: (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                overdue
                  ? "bg-(--primary-red)"
                  : completed
                    ? "bg-(--primary-color-1)"
                    : "bg-(--primary-blue)"
              }`}
            />
          ),
          cells: [
            task.id,
            task.title,
            task.category,
            task.status,
            task.assignedTo,
            task.createdBy,
            formatDueDate(task),
            task.createdDate,
            task.lastUpdate,
          ],
        };
      }}
    />
  );
}
