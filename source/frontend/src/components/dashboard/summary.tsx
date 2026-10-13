"use client";

import { getThaiDateKey } from "@/lib/format";
import {
  dueBucketMeta,
  emptyBucketCounts,
  getDueBucket,
  getDueBucketLimits,
  type DashboardItem,
} from "@/components/dashboard/dashboard_status";
import type { DashboardView } from "@/components/dashboard/view_toggle";

export default function Summary({
  items,
  loadingTasks,
  view,
}: {
  items: DashboardItem[];
  loadingTasks: boolean;
  view: DashboardView;
}) {
  const limits = getDueBucketLimits(new Date());
  // compare day on Thai clock
  const today = getThaiDateKey(limits.now);

  const isDueToday = (task: DashboardItem) => {
    if (task.due_date === null || new Date(task.due_date) <= limits.now) {
      return false;
    }

    return getThaiDateKey(task.due_date) === today;
  };

  const dueToday = items.filter(isDueToday).length;

  const isTicket = view === "ticket";

  // same items as the list. ticket include rejected
  const counts = items.reduce((acc, item) => {
    acc[getDueBucket(item.due_date, limits)] += 1;
    return acc;
  }, emptyBucketCounts());

  // hide empty range, but show all of them while loading
  const dueBuckets = dueBucketMeta
    .map((bucket) => ({
      ...bucket,
      count: counts[bucket.key],
    }))
    .filter((bucket) => loadingTasks || bucket.count > 0);

  // no item and not loading, hide the whole chart
  const hasChart = loadingTasks || items.length > 0;

  const summaryItems = isTicket
    ? [
        {
          label: "Rejected",
          value: items.filter((item) => item.status === "rejected").length,
        },
        {
          label: "Pending",
          value: items.filter((item) => item.status === "pending").length,
        },
      ]
    : [
        { label: "Due Today", value: dueToday },
        { label: "Active Task", value: items.length },
      ];

  return (
    <div className="flex min-h-26 w-full gap-5">
      {/* size container, so number size follow the squircle size */}
      <div className="flex flex-1 divide-x divide-(--primary-color-3) rounded-[20px] bg-white p-0 @container-size">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <h1 className="text-lg font-bold text-black">{item.label}</h1>
            <h1 className="text-[min(50cqh,25cqw)] leading-none font-extrabold text-black">
              {loadingTasks ? "-" : item.value}
            </h1>
          </div>
        ))}
      </div>

      <div
        className={`flex w-fit shrink-0 flex-col pr-5 ${hasChart ? "" : "hidden"}`}
      >
        <div className="flex items-start text-base font-bold text-black">
          <p>{isTicket ? "Due Tickets" : "Due Tasks"}</p>
        </div>

        <div className="flex flex-1">
          <div className="flex w-7.5 items-start">
            <div
              className={`flex h-full w-5 overflow-hidden rounded-[20px] ${loadingTasks ? "bg-white" : "bg-(--panel-bg)"}`}
            >
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

          <div
            className={`flex flex-1 flex-col text-lg font-medium text-black ${
              dueBuckets.length > 2 ? "justify-between" : "gap-1"
            }`}
          >
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
