"use client";

import type { CategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import Icon from "@/components/icon";
import {
  dueBucketMeta,
  getDueBucket,
  getDueBucketLimits,
  type DueBucketKey,
} from "@/components/dashboard/due_bucket";

export default function TaskOverview({
  tasks,
  loadingTasks,
  errorTasks,
  errorCategories,
  categoryMap,
}: {
  tasks: Task[];
  loadingTasks: boolean;
  errorTasks: boolean;
  errorCategories: boolean;
  categoryMap: CategoryMap;
}) {
  const limits = getDueBucketLimits(new Date());

  const grouped = tasks.reduce<Record<number, Record<DueBucketKey, number>>>(
    (acc, task) => {
      const bucket = getDueBucket(task.due_date, limits);
      if (!acc[task.category_id])
        acc[task.category_id] = {
          missing: 0,
          thisWeek: 0,
          nextWeek: 0,
          later: 0,
        };
      acc[task.category_id][bucket] += 1;
      return acc;
    },
    {},
  );

  const categoryIds = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="flex min-h-25 flex-1 flex-col gap-3 rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
      <div className="flex h-8 items-center gap-2 rounded-[20px] bg-(--primary-color-2) px-2">
        <Icon src="/header_donut_dark_green.svg" />
        <h1 className="text-base font-bold text-white">Task Overview</h1>
      </div>

      {loadingTasks ? (
        <p className="py-6 text-center text-base font-medium text-gray-500">
          Loading tasks...
        </p>
      ) : errorTasks ? (
        <p className="py-6 text-center text-base font-medium text-gray-500">
          Failed to load tasks
        </p>
      ) : errorCategories ? (
        <p className="py-6 text-center text-base font-medium text-gray-500">
          Failed to load categories
        </p>
      ) : tasks.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-4 text-center text-base font-medium text-gray-500">
          All tasks are done! Time to enjoy a well-earned break.
        </p>
      ) : (
        categoryIds.map((id) => {
          const counts = grouped[id];
          const total =
            counts.missing + counts.thisWeek + counts.nextWeek + counts.later;
          const visibleBuckets = dueBucketMeta.filter((b) => counts[b.key] > 0);

          return (
            <div key={id} className="flex rounded-2xl bg-white px-2 py-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1">
                  <p className="max-w-full shrink-0 truncate text-base font-bold text-black">
                    {categoryMap[id] ?? `Category ${id}`}
                  </p>

                  <div className="flex shrink-0 items-center gap-4">
                    {visibleBuckets.map((b) => (
                      <div key={b.key} className="flex items-center gap-1">
                        <span
                          className={`h-4 w-4 shrink-0 rounded-full ${b.color}`}
                        />
                        <span className={`text-base font-medium text-black`}>
                          {counts[b.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  {dueBucketMeta.map((b) =>
                    counts[b.key] > 0 ? (
                      <div
                        key={b.key}
                        className={b.color}
                        style={{ width: `${(counts[b.key] / total) * 100}%` }}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
