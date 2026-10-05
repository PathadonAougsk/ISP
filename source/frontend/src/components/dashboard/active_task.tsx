"use client";

import type { Task } from "@/lib/task";
import {
  dueBucketMeta,
  getDueBucket,
  getDueBucketLimits,
  type DueBucketKey,
} from "@/components/dashboard/due_bucket";

export default function ActiveTask({
  tasks,
  loadingTasks,
}: {
  tasks: Task[];
  loadingTasks: boolean;
}) {
  const now = new Date();
  const limits = getDueBucketLimits(now);
  const dueToday = tasks.filter((task) => {
    if (task.due_date === null) return false;

    const due = new Date(task.due_date);
    return (
      due > now &&
      due.getUTCFullYear() === now.getUTCFullYear() &&
      due.getUTCMonth() === now.getUTCMonth() &&
      due.getUTCDate() === now.getUTCDate()
    );
  }).length;

  const counts = tasks.reduce<Record<DueBucketKey, number>>(
    (acc, task) => {
      const bucket = getDueBucket(task.due_date, limits);
      acc[bucket] += 1;
      return acc;
    },
    { missing: 0, thisWeek: 0, nextWeek: 0, later: 0 },
  );

  // missing only show when something is missing
  const dueBuckets = dueBucketMeta
    .map((bucket) => ({
      ...bucket,
      count: counts[bucket.key],
    }))
    .filter((bucket) => bucket.key !== "missing" || bucket.count > 0);

  return (
    <div className="flex w-full gap-5">
      <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[30px] bg-(--panel-bg) p-0">
        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <h1 className="text-lg font-bold text-black">Due Today</h1>
          <h1
            className={`font-extrabold text-black ${
              dueBuckets.some((bucket) => bucket.key === "missing")
                ? "text-7xl"
                : "text-5xl"
            }`}
          >
            {loadingTasks ? "-" : dueToday}
          </h1>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <h1 className="text-lg font-bold text-black">Active Task</h1>
          <h1
            className={`font-extrabold text-black ${
              dueBuckets.some((bucket) => bucket.key === "missing")
                ? "text-7xl"
                : "text-5xl"
            }`}
          >
            {loadingTasks ? "-" : tasks.length}
          </h1>
        </div>
      </div>

      <div className="flex w-fit shrink-0 flex-col pr-5">
        <div className="flex items-start text-base font-bold text-black">
          <p>Due Tasks</p>
        </div>

        <div className="flex flex-1">
          <div className="flex w-7.5 items-start">
            <div className="flex h-full w-5 overflow-hidden rounded-[20px] bg-(--panel-bg)">
              {!loadingTasks && (
                <div className="flex h-full w-full flex-col">
                  {dueBuckets.map((bucket) => (
                    <div
                      key={bucket.key}
                      className={`w-full ${bucket.color}`}
                      style={{ flexGrow: bucket.count }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-1 text-lg font-medium text-black">
            {dueBuckets.map((bucket) => (
              <div key={bucket.key} className="flex items-center">
                <div className="flex w-7.5 items-center">
                  <div className={`h-5 w-5 rounded-full ${bucket.color}`} />
                </div>
                <div className="flex w-6 items-center text-base">
                  <p>{loadingTasks ? "-" : bucket.count}</p>
                </div>
                <div className="flex flex-1 items-center text-base">
                  <p>{bucket.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
