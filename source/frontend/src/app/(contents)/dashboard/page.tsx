"use client";

import { useMemo, useState } from "react";
import { useCurrentAccount } from "@/lib/account";
import { toCategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import Announcement from "@/components/dashboard/announcement";
import Missing from "@/components/dashboard/missing";
import Overview, {
  Summary,
  ViewToggle,
  ScopeToggle,
  type DashboardScope,
} from "@/components/dashboard/overview";
import TaskTicketList, {
  TaskList,
  TicketList,
} from "@/components/dashboard/task-ticket-list";
import TaskSlideup from "@/components/dashboard/task-slideup";
import TicketSlideup from "@/components/dashboard/ticket-slideup";
import type { DashboardView } from "@/components/dashboard/dashboard-data";
import { useDashboardFetching } from "@/components/dashboard/dashboard-fetching";
import { useDashboardView } from "@/components/dashboard/dashboard-view";

export default function Dashboard() {
  const {
    account: currentAccount,
    loading: accountLoading,
    error: accountError,
  } = useCurrentAccount();

  const {
    groups,
    categories,
    usernames,
    creatorRoles,
    loadingCategories,
    errorCategories,
    reloadTasks,
    reloadTickets,
  } = useDashboardFetching(currentAccount, accountLoading, accountError);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [view, setView] = useState<DashboardView>("task");
  const [scope, setScope] = useState<DashboardScope>("mine");

  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  const isLabUser = currentAccount?.role === "Lab User";

  // scope toggle is hidden for lab user
  const showScope = currentAccount !== null && !isLabUser;
  const isAllScope = showScope && scope === "all";

  // summary and overview use same items as the list. mine first, others after
  const {
    items: viewItems,
    overflowItems: viewOverflowItems,
    loading: loadingViewItems,
    error: errorViewItems,
    bucketCounts,
  } = useDashboardView(view, isAllScope, groups);

  return (
    <main className="flex min-h-full w-full min-w-0 flex-col gap-5 overflow-x-auto bg-(--background) px-5 pt-5 max-[600px]:min-w-150 min-[1000px]:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-3 min-[1000px]:w-[40%] min-[1000px]:min-w-120 min-[1000px]:max-w-300">
        <Announcement usernames={usernames} />

        <div className="flex h-180 shrink-0 flex-col gap-4 overflow-hidden rounded-[30px] bg-(--panel-bg) p-3 pb-6 min-[1000px]:rounded-t-[30px] min-[1000px]:rounded-b-none min-[1000px]:pb-3">
          <div className="flex flex-wrap justify-between">
            <ViewToggle value={view} onChange={setView} />
            {showScope && (
              <ScopeToggle value={scope} onChange={setScope} view={view} />
            )}
          </div>
          <Summary
            items={viewItems}
            overflowItems={viewOverflowItems}
            counts={bucketCounts.total}
            loading={loadingViewItems || errorViewItems}
            view={view}
          />

          <Overview
            categoryCounts={bucketCounts.byCategory}
            loadingTasks={loadingViewItems || loadingCategories}
            errorTasks={errorViewItems}
            errorCategories={errorCategories}
            categoryMap={categoryMap}
            view={view}
          />
        </div>
      </div>

      {/* contents: under 1000px the children become part of main */}
      <div className="contents min-[1000px]:flex min-[1000px]:min-w-0 min-[1000px]:flex-1 min-[1000px]:flex-col min-[1000px]:gap-3">
        {/* empty:hidden so no gap when Missing render nothing */}
        <div className="order-first empty:hidden min-[1000px]:order-0">
          <Missing
            myTasks={groups.myTasks}
            myPendingTickets={groups.myPendingTickets}
            myRejectedTickets={groups.myRejectedTickets}
          />
        </div>

        {/* list need own height when stacked */}
        <div className="order-last flex h-200 min-w-0 flex-col min-[1000px]:order-0 min-[1000px]:h-auto min-[1000px]:min-h-0 min-[1000px]:flex-1">
          <TaskTicketList>
            <TaskList
              myTasks={groups.myTasks}
              otherTasks={groups.otherTasks}
              categoryMap={categoryMap}
              usernames={usernames}
              isLabUser={isLabUser}
              onSelectTask={setSelectedTask}
            />
            <TicketList
              myRejectedTickets={groups.myRejectedTickets}
              myPendingTickets={groups.myPendingTickets}
              otherRejectedTickets={groups.otherRejectedTickets}
              otherPendingTickets={groups.otherPendingTickets}
              categoryMap={categoryMap}
              isLabUser={isLabUser}
              onSelectTicket={setSelectedTicket}
            />
          </TaskTicketList>
        </div>
      </div>

      {selectedTask && (
        <TaskSlideup
          task={selectedTask}
          categoryMap={categoryMap}
          usernames={usernames}
          currentUserId={currentAccount?.id ?? null}
          onClose={() => setSelectedTask(null)}
          onUpdated={reloadTasks}
        />
      )}

      {selectedTicket && (
        <TicketSlideup
          ticket={selectedTicket}
          categoryMap={categoryMap}
          usernames={usernames}
          creatorRoles={creatorRoles}
          currentUserId={currentAccount?.id ?? null}
          currentRole={currentAccount?.role ?? null}
          onClose={() => setSelectedTicket(null)}
          onUpdated={reloadTickets}
        />
      )}
    </main>
  );
}
