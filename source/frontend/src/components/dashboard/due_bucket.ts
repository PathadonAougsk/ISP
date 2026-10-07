import { getThaiDateParts } from "@/lib/format";

export type DueBucketKey = "missing" | "thisWeek" | "nextWeek" | "later";

export const dueBucketColor: Record<DueBucketKey, string> = {
  missing: "bg-(--primary-red)",
  thisWeek: "bg-(--primary-orange)",
  nextWeek: "bg-(--primary-yellow)",
  later: "bg-(--primary-blue)",
};

export const dueBucketMeta: {
  key: DueBucketKey;
  label: string;
  color: string;
}[] = [
  { key: "missing", label: "Missing", color: dueBucketColor.missing },
  { key: "thisWeek", label: "This week", color: dueBucketColor.thisWeek },
  { key: "nextWeek", label: "Next week", color: dueBucketColor.nextWeek },
  { key: "later", label: "Later", color: dueBucketColor.later },
];

const DAY_MS = 24 * 60 * 60 * 1000;

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

// only in_progress task or pending ticket can missing
export function isMissingTask(
  task: { status: string; due_date: string | null },
  now: Date,
): boolean {
  return task.status === "in_progress" && isMissing(task.due_date, now);
}

export function isMissingTicket(
  ticket: { status: string; due_date: string | null },
  now: Date,
): boolean {
  return ticket.status === "pending" && isMissing(ticket.due_date, now);
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
