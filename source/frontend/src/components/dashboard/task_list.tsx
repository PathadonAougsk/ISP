"use client";

import Image from "next/image";
import { Fragment } from "react";
import type { CategoryMap } from "@/lib/category";
import type { Account } from "@/lib/account";
import type { Task } from "@/lib/task";
import { formatDueDate } from "@/lib/format";
import {
  dueBucketColor,
  getDueBucket,
} from "@/components/dashboard/due_bucket";

export default function TaskList({
  myTasks,
  otherTasks,
  loadingMyTasks,
  loadingOtherTasks,
  categoryMap,
  usernames,
  currentAccount,
  onSelectTask,
}: {
  myTasks: Task[];
  otherTasks: Task[];
  loadingMyTasks: boolean;
  loadingOtherTasks: boolean;
  categoryMap: CategoryMap;
  usernames: Record<string, string>;
  currentAccount: Account | null;
  onSelectTask: (task: Task) => void;
}) {
  const now = new Date();

  const isLabUser = currentAccount?.role === "Lab User";

  const hasMyTasks = !loadingMyTasks && myTasks.length > 0;
  const hasOtherTasks = otherTasks.length > 0;

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      onClick={() => onSelectTask(task)}
      className="group flex h-8 shrink-0 cursor-pointer items-center gap-6 rounded-[20px] bg-white px-3 hover:bg-gray-100"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dueBucketColor[getDueBucket(task.due_date, now)]}`}
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
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex h-8 shrink-0 items-center gap-4 rounded-[20px] bg-(--primary-color-2) px-2">
        <Image
          src="/header_donut_dark_green.svg"
          width={0}
          height={0}
          sizes="auto"
          className="h-4 w-auto"
          alt=""
          draggable={false}
        />
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
          {loadingMyTasks || loadingOtherTasks
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
        </div>
      )}
    </div>
  );
}
