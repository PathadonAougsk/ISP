import { getThaiDateParts } from "@/lib/format";

export type DueBucketKey = "missing" | "thisWeek" | "nextWeek" | "later";

export type DashboardView = "task" | "ticket";

// the six lists in dashboard
export type DashboardGroup =
  | "myTasks"
  | "otherTasks"
  | "myRejectedTickets"
  | "myPendingTickets"
  | "otherRejectedTickets"
  | "otherPendingTickets";

export type DashboardLimits = Record<DashboardGroup, number>;

// fields that task and ticket share
export type DashboardItem = {
  status: string;
  category_id: number;
  due_date: string | null;
};

// one list in dashboard, made by useGroup
export type GroupState<T extends DashboardItem = DashboardItem> = {
  // cut to the limit, for the UI
  items: T[];
  // full list, everything fetched
  all: T[];
  loading: boolean;
  error: boolean;
  loadMore: () => void;
};

export const dueBucketColor: Record<DueBucketKey, string> = {
  missing: "bg-(--primary-red)",
  thisWeek: "bg-(--primary-orange)",
  nextWeek: "bg-(--primary-yellow)",
  later: "bg-(--primary-blue)",
};

export const dueBucketMeta: {
  key: DueBucketKey;
  label: string;
}[] = [
  { key: "missing", label: "Missing" },
  { key: "thisWeek", label: "This week" },
  { key: "nextWeek", label: "Next week" },
  { key: "later", label: "Later" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export type BucketCounts = Record<DueBucketKey, number>;

export function emptyBucketCounts(): Record<DueBucketKey, number> {
  return { missing: 0, thisWeek: 0, nextWeek: 0, later: 0 };
}

// now is real time, weekend use Thai clock
export type DueBucketLimits = {
  now: Date;
  thisWeekEnd: Date;
  nextWeekEnd: Date;
};

// call this once per render, then reuse for every task
export function getDueBucketLimits(now: Date): DueBucketLimits {
  const local = getThaiDateParts(now);

  const thisWeekEnd = new Date(
    Date.UTC(
      local.year,
      local.month - 1,
      local.day - local.weekday + 6,
      23,
      59,
      59,
      999,
    ),
  );

  const nextWeekEnd = new Date(thisWeekEnd.getTime() + 7 * DAY_MS);

  return { now, thisWeekEnd, nextWeekEnd };
}

// missing = due date already pass. no due date is never missing
function isMissing(dueDateIso: string | null, now: Date): boolean {
  return dueDateIso !== null && new Date(dueDateIso) <= now;
}

// missing = status in the list and due date pass
// task: ["in_progress"], ticket: ["pending", "rejected"]
export function isMissingItem(
  item: { status: string; due_date: string | null },
  statuses: string[],
  now: Date,
): boolean {
  return statuses.includes(item.status) && isMissing(item.due_date, now);
}

export function getDueBucket(
  dueDateIso: string | null,
  limits: DueBucketLimits,
): DueBucketKey {
  if (dueDateIso === null) return "later";
  if (isMissing(dueDateIso, limits.now)) return "missing";

  const due = getThaiDateParts(dueDateIso);
  const dueCalendarDate = new Date(Date.UTC(due.year, due.month - 1, due.day));

  if (dueCalendarDate <= limits.thisWeekEnd) return "thisWeek";
  if (dueCalendarDate <= limits.nextWeekEnd) return "nextWeek";
  return "later";
}

// one pass over items. total for summary, byCategory for overview
export function countDueBuckets(
  items: DashboardItem[],
  limits: DueBucketLimits,
) {
  const total = emptyBucketCounts();
  const byCategory: Record<number, BucketCounts> = {};

  for (const item of items) {
    const bucket = getDueBucket(item.due_date, limits);

    if (!byCategory[item.category_id]) {
      byCategory[item.category_id] = emptyBucketCounts();
    }

    total[bucket] += 1;
    byCategory[item.category_id][bucket] += 1;
  }

  return { total, byCategory };
}

export const ticketStatusText: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const ticketStatusIcon: Record<string, string> = {
  pending: "/pending.svg",
  accepted: "/accepted.svg",
  rejected: "/rejected.svg",
};
