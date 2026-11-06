import type { DashboardGroups } from "@/components/dashboard/dashboard-fetching";
import {
  countDueBuckets,
  getDueBucketLimits,
  type DashboardItem,
  type DashboardView,
  type GroupState,
} from "@/components/dashboard/dashboard-data";

// what the dashboard show now: items, overflow, flags and due counts
// summary, overview and list all use same items
export function useDashboardView(
  view: DashboardView,
  isAllScope: boolean,
  groups: DashboardGroups,
) {
  // mine first, others after
  const active: GroupState[] =
    view === "ticket"
      ? [
          groups.myRejectedTickets,
          groups.myPendingTickets,
          ...(isAllScope
            ? [groups.otherRejectedTickets, groups.otherPendingTickets]
            : []),
        ]
      : [groups.myTasks, ...(isAllScope ? [groups.otherTasks] : [])];

  const items = active.flatMap((group) => group.items);

  // extra item of each list in the same scope, for the "+" sign
  const overflowItems = active
    .map((group) => group.overflow)
    .filter((item): item is DashboardItem => item !== null);

  const loading = active.some((group) => group.loading);

  // error only counts when nothing to show, failed Load More keep old items
  const error = items.length === 0 && active.some((group) => group.error);

  // no useMemo, so "now" is fresh on every render
  const bucketCounts = countDueBuckets(items, getDueBucketLimits(new Date()));

  return { items, overflowItems, loading, error, bucketCounts };
}
