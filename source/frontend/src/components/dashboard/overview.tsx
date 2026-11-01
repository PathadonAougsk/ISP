"use client";

import { useRef, type KeyboardEvent } from "react";
import { getThaiDateKey } from "@/lib/format";
import type { CategoryMap } from "@/lib/category";
import Icon from "@/components/icon";
import {
  dueBucketColor,
  dueBucketMeta,
  emptyBucketCounts,
  getDueBucket,
  getDueBucketLimits,
  type DashboardItem,
  type DashboardView,
  type DueBucketKey,
} from "@/components/dashboard/dashboard_status";
import { ListMessage } from "@/components/dashboard/dashboard_utils";

// View and scope toggles

export type DashboardScope = "mine" | "all";

type ToggleProps = {
  options: { label: string; onClick: () => void }[];
  selectedIndex: number;
  ariaLabel: string;
  widthClassName: string;
};

function Toggle({
  options,
  selectedIndex,
  ariaLabel,
  widthClassName,
}: ToggleProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = selectedIndex;

    if (event.key === "ArrowLeft") {
      nextIndex = Math.max(0, selectedIndex - 1);
    } else if (event.key === "ArrowRight") {
      nextIndex = Math.min(options.length - 1, selectedIndex + 1);
    } else {
      return;
    }

    event.preventDefault();
    options[nextIndex]?.onClick();
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex h-10 shrink-0 rounded-full bg-(--primary-color-2) ${widthClassName}`}
    >
      <div
        className="absolute inset-y-0 left-0 p-1 transition-transform duration-150 ease-out"
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      >
        <div className="h-full w-full rounded-full bg-white" />
      </div>

      {options.map(({ label, onClick }, index) => {
        const selected = index === selectedIndex;

        return (
          <button
            key={label}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            className={`relative z-10 h-full flex-1 cursor-pointer rounded-full text-lg font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary-color-2) ${
              selected ? "text-black" : "text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ViewToggle({
  value,
  onChange,
}: {
  value: DashboardView;
  onChange: (value: DashboardView) => void;
}) {
  return (
    <Toggle
      options={[
        { label: "Task", onClick: () => onChange("task") },
        { label: "Ticket", onClick: () => onChange("ticket") },
      ]}
      selectedIndex={value === "task" ? 0 : 1}
      ariaLabel="Dashboard view"
      widthClassName="w-39/100"
    />
  );
}

export function ScopeToggle({
  value,
  onChange,
  view,
}: {
  value: DashboardScope;
  onChange: (value: DashboardScope) => void;
  view: DashboardView;
}) {
  const noun = view === "ticket" ? "Tickets" : "Tasks";

  return (
    <Toggle
      options={[
        { label: `My ${noun}`, onClick: () => onChange("mine") },
        { label: `All ${noun}`, onClick: () => onChange("all") },
      ]}
      selectedIndex={value === "mine" ? 0 : 1}
      ariaLabel="Dashboard scope"
      widthClassName="w-59/100"
    />
  );
}

// Summary

export function Summary({
  items,
  overflowItems,
  loading,
  view,
}: {
  items: DashboardItem[];
  overflowItems: DashboardItem[];
  loading: boolean;
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

  // due today can hide behind a past due one
  const moreDueToday = overflowItems.some(isDueToday);

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
    .filter((bucket) => loading || bucket.count > 0);

  // no item and not loading, hide the whole chart
  const hasChart = loading || items.length > 0;

  // "+" when the list still have more to load
  const withMore = (value: number, more: boolean) =>
    more ? `${value}+` : String(value);

  const summaryItems = isTicket
    ? [
        {
          label: "Rejected",
          value: withMore(
            items.filter((item) => item.status === "rejected").length,
            overflowItems.some((item) => item.status === "rejected"),
          ),
        },
        {
          label: "Pending",
          value: withMore(
            items.filter((item) => item.status === "pending").length,
            overflowItems.some((item) => item.status === "pending"),
          ),
        },
      ]
    : [
        { label: "Due Today", value: withMore(dueToday, moreDueToday) },
        {
          label: "Active Task",
          value: withMore(items.length, overflowItems.length > 0),
        },
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
              {loading ? "-" : item.value}
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
              className={`flex h-full w-5 overflow-hidden rounded-[20px] ${loading ? "bg-(--primary-color-3)" : "bg-(--panel-bg)"}`}
            >
              {!loading && (
                <div className="flex h-full w-full flex-col">
                  {dueBuckets.map((bucket) => (
                    <div
                      key={bucket.key}
                      className={`w-full ${dueBucketColor[bucket.key]}`}
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
                  <div
                    className={`h-5 w-5 rounded-full ${dueBucketColor[bucket.key]}`}
                  />
                </div>
                <div className="flex w-6 items-center text-base">
                  <p>{loading ? "-" : bucket.count}</p>
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

// Overview

export default function Overview({
  items,
  loadingTasks,
  errorTasks,
  errorCategories,
  categoryMap,
  view,
}: {
  items: DashboardItem[];
  loadingTasks: boolean;
  errorTasks: boolean;
  errorCategories: boolean;
  categoryMap: CategoryMap;
  view: DashboardView;
}) {
  const limits = getDueBucketLimits(new Date());

  const isTicket = view === "ticket";
  const noun = isTicket ? "tickets" : "tasks";

  // task and ticket both group by due date range
  const grouped = items.reduce<Record<number, Record<DueBucketKey, number>>>(
    (acc, task) => {
      const bucket = getDueBucket(task.due_date, limits);
      if (!acc[task.category_id]) {
        acc[task.category_id] = emptyBucketCounts();
      }
      acc[task.category_id][bucket] += 1;
      return acc;
    },
    {},
  );

  const categoryIds = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex h-8 items-center gap-2 rounded-[20px] bg-(--primary-color-2) px-2">
        <Icon src="/header_donut_dark_green.svg" />
        <h1 className="text-base font-bold text-white">
          {isTicket ? "Ticket Overview" : "Task Overview"}
        </h1>
      </div>

      {loadingTasks ? (
        <ListMessage>Loading {noun}...</ListMessage>
      ) : errorTasks ? (
        <ListMessage>Failed to load {noun}</ListMessage>
      ) : errorCategories ? (
        <ListMessage>Failed to load categories</ListMessage>
      ) : items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-4 text-center text-base font-medium text-gray-500">
          {isTicket
            ? "No tickets! Smooth sailing ahead, so enjoy the calm."
            : "All tasks are done! Time to enjoy a well-earned break."}
        </p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin">
          {categoryIds.map((id) => {
            const counts = grouped[id];
            const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
            const visibleBuckets = dueBucketMeta.filter(
              (b) => counts[b.key] > 0,
            );

            return (
              <div key={id} className="flex rounded-2xl bg-white px-2 py-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="max-w-full shrink-0 truncate text-base font-bold text-black">
                      {categoryMap[id] ?? "-"}
                    </p>

                    <div className="flex shrink-0 items-center gap-4">
                      {visibleBuckets.map((b) => (
                        <div key={b.key} className="flex items-center gap-1">
                          <span
                            className={`h-4 w-4 shrink-0 rounded-full ${dueBucketColor[b.key]}`}
                          />
                          <span className="text-base font-medium text-black">
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
                          className={dueBucketColor[b.key]}
                          style={{
                            width: `${(counts[b.key] / total) * 100}%`,
                          }}
                        />
                      ) : null,
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
