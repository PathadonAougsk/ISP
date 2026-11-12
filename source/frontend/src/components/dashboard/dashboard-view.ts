import type { DashboardGroups } from "@/components/dashboard/dashboard-fetching";
import {
  countDueBuckets,
  getDueBucketLimits,
  type DashboardView,
  type GroupState,
} from "@/components/dashboard/dashboard-data";

// what the dashboard show now: items, flags and due counts
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

  const items = active.flatMap((group) => group.all);

  const loading = active.some((group) => group.loading);

  // error only counts when nothing to show, failed reload keep old items
  const error = items.length === 0 && active.some((group) => group.error);

  // no useMemo, so "now" is fresh on every render
  const bucketCounts = countDueBuckets(items, getDueBucketLimits(new Date()));

  return { items, loading, error, bucketCounts };
}
