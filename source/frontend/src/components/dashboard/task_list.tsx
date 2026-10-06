"use client";

import { Fragment } from "react";
import type { CategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import { formatShortDate } from "@/lib/format";
import {
  dueBucketColor,
  getDueBucket,
  getDueBucketLimits,
  isMissingTask,
} from "@/components/dashboard/due_bucket";
import {
  ListHeader,
  ListMessage,
  listGridClass,
} from "@/components/dashboard/list_parts";

export default function TaskList({
  myTasks,
  otherTasks,
  loadingMyTasks,
  loadingOtherTasks,
  errorMyTasks,
  errorOtherTasks,
  categoryMap,
  usernames,
  isLabUser,
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
  isLabUser: boolean;
  onSelectTask: (task: Task) => void;
}) {
  const limits = getDueBucketLimits(new Date());

  const hasMyTasks = !loadingMyTasks && myTasks.length > 0;
  const hasOtherTasks = otherTasks.length > 0;

  const renderTask = (task: Task) => {
    const overdue = isMissingTask(task, limits.now);

    return (
      <button
        key={task.id}
        type="button"
        onClick={() => onSelectTask(task)}
        className={`group flex h-8 w-full shrink-0 cursor-pointer items-center gap-6 rounded-[20px] px-3 text-left ${
          overdue
            ? "bg-(--primary-red) text-white hover:bg-(--primary-red-hover)"
            : "bg-white text-black hover:bg-gray-100"
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-white" : dueBucketColor[getDueBucket(task.due_date, limits)]}`}
        />
        <div className={listGridClass}>
          <p className="truncate text-sm">{task.name}</p>
          <p className="truncate text-sm">
            {usernames[task.created_by] ?? "-"}
          </p>
          <p className="truncate text-sm">
            {categoryMap[task.category_id] ?? "-"}
          </p>
          <p className="text-sm">{formatShortDate(task.due_date)}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <ListHeader titles={["Task Name", "Created by", "Category", "Duedate"]} />

      {!hasMyTasks && !hasOtherTasks ? (
        <ListMessage>
          {errorMyTasks || errorOtherTasks
            ? "Failed to load tasks"
            : loadingMyTasks || loadingOtherTasks
              ? "Loading tasks..."
              : "Good job! You have completed all tasks."}
        </ListMessage>
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
                Others' tasks
              </h1>
              {otherTasks.map(renderTask)}
            </Fragment>
          )}

          {loadingOtherTasks && <ListMessage>Loading tasks...</ListMessage>}

          {errorMyTasks && (
            <ListMessage>
              {isLabUser ? "Failed to load tasks" : "Failed to load my tasks"}
            </ListMessage>
          )}

          {errorOtherTasks && (
            <ListMessage>Failed to load others' tasks</ListMessage>
          )}
        </div>
      )}
    </div>
  );
}
