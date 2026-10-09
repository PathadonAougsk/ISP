"use client";

import type { Task } from "@/lib/task";
import { getThaiDateParts } from "@/lib/format";
import {
  dueBucketMeta,
  emptyBucketCounts,
  getDueBucket,
  getDueBucketLimits,
  type DueBucketKey,
} from "@/components/dashboard/dashboard_status";

export default function Summary({
  tasks,
  loadingTasks,
}: {
  tasks: Task[];
  loadingTasks: boolean;
}) {
  const limits = getDueBucketLimits(new Date());
  // compare day on Thai clock
  const todayParts = getThaiDateParts(limits.now);
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;

  const isDueToday = (task: Task) => {
    if (task.due_date === null || new Date(task.due_date) <= limits.now) {
      return false;
    }

    const dueParts = getThaiDateParts(task.due_date);
    return `${dueParts.year}-${dueParts.month}-${dueParts.day}` === today;
  };

  const dueToday = tasks.filter(isDueToday).length;

  const counts = tasks.reduce<Record<DueBucketKey, number>>((acc, task) => {
    const bucket = getDueBucket(task.due_date, limits);
    acc[bucket] += 1;
    return acc;
  }, emptyBucketCounts());

  // missing only show when something is missing
  const dueBuckets = dueBucketMeta
    .map((bucket) => ({
      ...bucket,
      count: counts[bucket.key],
    }))
    .filter((bucket) => bucket.key !== "missing" || bucket.count > 0);

  const hasMissing = dueBuckets.some((bucket) => bucket.key === "missing");

  const summaryItems = [
    { label: "Due Today", value: dueToday },
    { label: "Active Task", value: tasks.length },
  ];

  return (
    <div className="flex w-full gap-5">
      <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[20px] bg-white p-0">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <h1 className="text-lg font-bold text-black">{item.label}</h1>
            <h1
              className={`font-extrabold text-black ${
                hasMissing ? "text-7xl" : "text-5xl"
              }`}
            >
              {loadingTasks ? "-" : item.value}
            </h1>
          </div>
        ))}
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
