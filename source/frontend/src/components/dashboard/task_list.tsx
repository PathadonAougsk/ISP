"use client";

import { Fragment } from "react";
import type { CategoryMap } from "@/lib/category";
import type { Account } from "@/lib/account";
import type { Task } from "@/lib/task";
import { formatDueDate } from "@/lib/format";
import Icon from "@/components/icon";
import {
  dueBucketColor,
  getDueBucket,
  getDueBucketLimits,
} from "@/components/dashboard/due_bucket";

export default function TaskList({
  myTasks,
  otherTasks,
  loadingMyTasks,
  loadingOtherTasks,
  errorMyTasks,
  errorOtherTasks,
  categoryMap,
  usernames,
  currentAccount,
  onSelectTask,
}: {
  myTasks: Task[];
  otherTasks: Task[];
  loadingMyTasks: boolean;
  loadingOtherTasks: boolean;
  errorMyTasks: boolean;
  errorOtherTasks: boolean;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  currentAccount: Account | null;
  onSelectTask: (task: Task) => void;
}) {
  const limits = getDueBucketLimits(new Date());

  const isLabUser = currentAccount?.role === "Lab User";

  const hasMyTasks = !loadingMyTasks && myTasks.length > 0;
  const hasOtherTasks = otherTasks.length > 0;

  const renderTask = (task: Task) => (
    <button
      key={task.id}
      type="button"
      onClick={() => onSelectTask(task)}
      className="group flex h-8 w-full shrink-0 cursor-pointer items-center gap-6 rounded-[20px] bg-white px-3 text-left hover:bg-gray-100"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dueBucketColor[getDueBucket(task.due_date, limits)]}`}
      />
      <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
        <p className="truncate text-sm text-black">{task.name}</p>
        <p className="truncate text-sm text-black">
          {usernames[task.created_by] ?? "-"}
        </p>
        <p className="truncate text-sm text-black">
          {categoryMap[task.category_id] ?? "-"}
        </p>
        <p className="text-sm text-black">{formatDueDate(task.due_date)}</p>
      </div>
    </button>
  );

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex h-8 shrink-0 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Icon src="/header_donut_dark_green.svg" />
        <div className="grid flex-1 grid-cols-[2fr_1.4fr_1.4fr_minmax(160px,1.4fr)] items-center gap-2">
          <h1 className="truncate text-base font-bold text-white">Task Name</h1>
          <h1 className="truncate text-base font-bold text-white">
            Created by
          </h1>
          <h1 className="truncate text-base font-bold text-white">Category</h1>
          <h1 className="truncate text-base font-bold text-white">Duedate</h1>
        </div>
      </div>

      {!hasMyTasks && !hasOtherTasks ? (
        <p className="py-6 text-center text-base font-medium text-gray-500">
          {errorMyTasks || errorOtherTasks
            ? "Failed to load tasks"
            : loadingMyTasks || loadingOtherTasks
              ? "Loading tasks..."
              : "Good job! You have completed all tasks."}
        </p>
      ) : (
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {hasMyTasks && (
            <Fragment>
              {!isLabUser && (
                <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">
                  My tasks
                </h1>
              )}
              {myTasks.map(renderTask)}
            </Fragment>
          )}

          {hasOtherTasks && (
            <Fragment>
              <h1 className="flex shrink-0 pl-1 text-base font-semibold text-black">
                Other tasks
              </h1>
              {otherTasks.map(renderTask)}
            </Fragment>
          )}

          {loadingOtherTasks && (
            <p className="py-2 text-center text-sm font-medium text-gray-500">
              Loading tasks...
            </p>
          )}

          {errorMyTasks && (
            <p className="py-2 text-center text-sm font-medium text-(--primary-red-darker)">
              {isLabUser ? "Failed to load tasks" : "Failed to load my tasks"}
            </p>
          )}

          {errorOtherTasks && (
            <p className="py-2 text-center text-sm font-medium text-(--primary-red-darker)">
              Failed to load other tasks
            </p>
          )}
        </div>
      )}
    </div>
  );
}
