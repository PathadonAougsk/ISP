export type DueBucketKey = "thisWeek" | "nextWeek" | "later";

export const dueBucketColor: Record<DueBucketKey, string> = {
  thisWeek: "bg-(--primary-red)",
  nextWeek: "bg-(--primary-yellow)",
  later: "bg-(--primary-blue)",
};

export const dueBucketMeta: {
  key: DueBucketKey;
  label: string;
  color: string;
}[] = [
  { key: "thisWeek", label: "This week", color: dueBucketColor.thisWeek },
  { key: "nextWeek", label: "Next week", color: dueBucketColor.nextWeek },
  { key: "later", label: "Later", color: dueBucketColor.later },
];

export function getWeekBounds(date: Date) {
  const day = date.getUTCDay();
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - day,
    ),
  );
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate() + 6,
      23,
      59,
      59,
      999,
    ),
  );
  return { start, end };
}

export type DueBucketLimits = { thisWeekEnd: Date; nextWeekEnd: Date };

// call this once per render, then reuse for every task
export function getDueBucketLimits(now: Date): DueBucketLimits {
  const { end: thisWeekEnd } = getWeekBounds(now);
  const nextWeekEnd = new Date(
    Date.UTC(
      thisWeekEnd.getUTCFullYear(),
      thisWeekEnd.getUTCMonth(),
      thisWeekEnd.getUTCDate() + 7,
      23,
      59,
      59,
      999,
    ),
  );

  return { thisWeekEnd, nextWeekEnd };
}

export function getDueBucket(
  dueDateIso: string | null,
  limits: DueBucketLimits,
): DueBucketKey {
  if (dueDateIso === null) return "later";

  const due = new Date(dueDateIso);

  if (due <= limits.thisWeekEnd) return "thisWeek";
  if (due <= limits.nextWeekEnd) return "nextWeek";
  return "later";
}
