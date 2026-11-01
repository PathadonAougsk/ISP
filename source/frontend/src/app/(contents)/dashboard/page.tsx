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
} from "@/components/dashboard/task_ticket_list";
import TaskSlideup from "@/components/dashboard/task_slideup";
import TicketSlideup from "@/components/dashboard/ticket_slideup";
import type {
  DashboardGroup,
  DashboardItem,
  DashboardLimits,
  DashboardView,
} from "@/components/dashboard/dashboard_status";
import { useDashboardFetching } from "@/components/dashboard/dashboard_fetching";

// limit increment when clicking Load More button
const INCREMENT = 10;

const INITIAL_LIMITS: DashboardLimits = {
  myTasks: 10,
  otherTasks: 10,
  myRejectedTickets: 10,
  myPendingTickets: 10,
  otherRejectedTickets: 10,
  otherPendingTickets: 10,
};

export default function Dashboard() {
  const {
    account: currentAccount,
    loading: accountLoading,
    error: accountError,
  } = useCurrentAccount();

  const [limits, setLimits] = useState<DashboardLimits>(INITIAL_LIMITS);

  const {
    myTasks,
    myRejectedTickets,
    myPendingTickets,
    shownMyTasks,
    shownOtherTasks,
    shownMyRejectedTickets,
    shownMyPendingTickets,
    shownOtherRejectedTickets,
    shownOtherPendingTickets,
    overflowItems,
    refreshing,
    taskCounts,
    ticketCounts,
    categories,
    usernames,
    creatorRoles,
    loadingMyTasks,
    loadingOtherTasks,
    loadingCategories,
    loadingMyTickets,
    loadingOtherTickets,
    errorMyTasks,
    errorOtherTasks,
    errorCategories,
    errorMyTickets,
    errorOtherTickets,
    reloadTasks,
    reloadTickets,
  } = useDashboardFetching(
    currentAccount,
    accountLoading,
    accountError,
    limits,
  );

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [view, setView] = useState<DashboardView>("task");
  const [scope, setScope] = useState<DashboardScope>("mine");

  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  const isLabUser = currentAccount?.role === "Lab User";

  // scope toggle is hidden for lab user
  const showScope = currentAccount !== null && !isLabUser;
  const isAllScope = showScope && scope === "all";

  const isTicketView = view === "ticket";

  const handleLoadMore = (group: DashboardGroup) =>
    setLimits((prev) => ({ ...prev, [group]: prev[group] + INCREMENT }));

  // summary and overview use same items as the list. mine first, others after
  const viewItems = isTicketView
    ? [
        ...shownMyRejectedTickets,
        ...shownMyPendingTickets,
        ...(isAllScope
          ? [...shownOtherRejectedTickets, ...shownOtherPendingTickets]
          : []),
      ]
    : [...shownMyTasks, ...(isAllScope ? shownOtherTasks : [])];

  // extra item of each list in the same scope, for the "+" sign
  const viewOverflowItems = (
    isTicketView
      ? [
          overflowItems.myRejectedTickets,
          overflowItems.myPendingTickets,
          ...(isAllScope
            ? [
                overflowItems.otherRejectedTickets,
                overflowItems.otherPendingTickets,
              ]
            : []),
        ]
      : [
          overflowItems.myTasks,
          ...(isAllScope ? [overflowItems.otherTasks] : []),
        ]
  ).filter((item): item is DashboardItem => item !== null);

  const loadingViewItems = isTicketView
    ? loadingMyTickets || (isAllScope && loadingOtherTickets)
    : loadingMyTasks || (isAllScope && loadingOtherTasks);
  const errorViewItems = isTicketView
    ? errorMyTickets || (isAllScope && errorOtherTickets)
    : errorMyTasks || (isAllScope && errorOtherTasks);

  return (
    <main className="flex min-h-full w-full min-w-0 flex-col gap-5 overflow-x-auto bg-(--background) px-5 pt-5 max-[600px]:min-w-150 min-[1000px]:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-3 min-[1000px]:w-[40%] min-[1000px]:min-w-120 min-[1000px]:max-w-300">
        <Announcement />

        <div className="flex h-160 shrink-0 flex-col gap-4 overflow-hidden rounded-[30px] bg-(--panel-bg) p-3 pb-6 min-[1000px]:rounded-t-[30px] min-[1000px]:rounded-b-none min-[1000px]:pb-3">
          <div className="flex flex-wrap justify-between">
            <ViewToggle value={view} onChange={setView} />
            {showScope && (
              <ScopeToggle value={scope} onChange={setScope} view={view} />
            )}
          </div>
          <Summary
            items={viewItems}
            overflowItems={viewOverflowItems}
            loading={loadingViewItems || errorViewItems}
            view={view}
          />

          <Overview
            items={viewItems}
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
            myTasks={myTasks}
            myPendingTickets={myPendingTickets}
            myRejectedTickets={myRejectedTickets}
            loadingMyTasks={loadingMyTasks || errorMyTasks}
            loadingMyTickets={loadingMyTickets || errorMyTickets}
            limits={limits}
          />
        </div>

        {/* list need own height when stacked */}
        <div className="order-last flex h-200 min-w-0 flex-col min-[1000px]:order-0 min-[1000px]:h-auto min-[1000px]:min-h-0 min-[1000px]:flex-1">
          <TaskTicketList>
            <TaskList
              myTasks={shownMyTasks}
              otherTasks={shownOtherTasks}
              loadingMyTasks={loadingMyTasks}
              loadingOtherTasks={loadingOtherTasks}
              errorMyTasks={errorMyTasks}
              errorOtherTasks={errorOtherTasks}
              categoryMap={categoryMap}
              usernames={usernames}
              isLabUser={isLabUser}
              counts={taskCounts}
              overflowItems={overflowItems}
              refreshing={refreshing}
              onLoadMore={handleLoadMore}
              onSelectTask={setSelectedTask}
            />
            <TicketList
              myRejectedTickets={shownMyRejectedTickets}
              myPendingTickets={shownMyPendingTickets}
              otherRejectedTickets={shownOtherRejectedTickets}
              otherPendingTickets={shownOtherPendingTickets}
              loadingMyTickets={loadingMyTickets}
              loadingOtherTickets={loadingOtherTickets}
              errorMyTickets={errorMyTickets}
              errorOtherTickets={errorOtherTickets}
              categoryMap={categoryMap}
              isLabUser={isLabUser}
              counts={ticketCounts}
              overflowItems={overflowItems}
              refreshing={refreshing}
              onLoadMore={handleLoadMore}
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
