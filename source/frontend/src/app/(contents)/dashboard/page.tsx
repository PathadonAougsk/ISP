"use client";

import { useMemo, useState } from "react";
import { useCurrentAccount } from "@/lib/account";
import { toCategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import Announcement from "@/components/dashboard/announcement";
import Missing from "@/components/dashboard/missing";
import Summary from "@/components/dashboard/summary";
import Overview from "@/components/dashboard/overview";
import TaskTicketList from "@/components/dashboard/task_ticket_list";
import TaskSlideup from "@/components/dashboard/task_slideup";
import TicketSlideup from "@/components/dashboard/ticket_slideup";
import ViewToggle, {
  type DashboardView,
} from "@/components/dashboard/view_toggle";
import { useDashboardFetching } from "@/components/dashboard/dashboard_fetching";

const MAX_TASK = 20;
const MAX_TICKET = 20;

export default function Dashboard() {
  const { account: currentAccount, loading: accountLoading } =
    useCurrentAccount();

  const {
    myTasks,
    otherTasks,
    categories,
    myRejectedTickets,
    myPendingTickets,
    otherPendingTickets,
    usernames,
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
  } = useDashboardFetching(
    currentAccount,
    accountLoading,
    MAX_TASK,
    MAX_TICKET,
  );

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [view, setView] = useState<DashboardView>("task");

  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  const isLabUser = currentAccount?.role === "Lab User";

  // summary and overview read from the selected view
  const isTicketView = view === "ticket";
  const viewItems = isTicketView ? myPendingTickets : myTasks;
  const loadingViewItems = isTicketView ? loadingMyTickets : loadingMyTasks;
  const errorViewItems = isTicketView ? errorMyTickets : errorMyTasks;

  // missing panel need a flat ticket list
  const tickets = useMemo(
    () => [...myRejectedTickets, ...myPendingTickets, ...otherPendingTickets],
    [myRejectedTickets, myPendingTickets, otherPendingTickets],
  );

  const othersOnly = useMemo(() => {
    const myTaskIds = new Set(myTasks.map((task) => task.id));

    // remove dupe tasks
    return otherTasks.filter((task) => !myTaskIds.has(task.id));
  }, [myTasks, otherTasks]);

  const visibleOtherTasks = useMemo(() => {
    if (loadingMyTasks) return [];

    return othersOnly.slice(0, Math.max(MAX_TASK - myTasks.length, 0));
  }, [loadingMyTasks, myTasks.length, othersOnly]);

  const showLoadingOtherTasks =
    loadingOtherTasks && (loadingMyTasks || myTasks.length < MAX_TASK);

  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-120 max-w-300 shrink-0 flex-col gap-3">
        <Announcement />

        <div className="flex h-160 shrink-0 flex-col gap-4 overflow-hidden rounded-t-[30px] rounded-b-none bg-(--panel-bg) p-3">
          <ViewToggle value={view} onChange={setView} />
          <Summary
            tasks={viewItems}
            loadingTasks={loadingViewItems || errorViewItems}
            view={view}
            rejectedCount={myRejectedTickets.length}
          />

          <Overview
            tasks={viewItems}
            loadingTasks={loadingViewItems || loadingCategories}
            errorTasks={errorViewItems}
            errorCategories={errorCategories}
            categoryMap={categoryMap}
            view={view}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Missing
          myTasks={myTasks}
          otherTasks={othersOnly}
          tickets={tickets}
          loadingMyTasks={loadingMyTasks || errorMyTasks}
          loadingOtherTasks={loadingOtherTasks || errorOtherTasks}
          loadingTickets={
            loadingMyTickets ||
            loadingOtherTickets ||
            errorMyTickets ||
            errorOtherTickets
          }
          isLabUser={isLabUser}
        />

        <TaskTicketList
          myTasks={myTasks}
          otherTasks={visibleOtherTasks}
          loadingMyTasks={loadingMyTasks}
          loadingOtherTasks={showLoadingOtherTasks}
          errorMyTasks={errorMyTasks}
          errorOtherTasks={errorOtherTasks}
          myRejectedTickets={myRejectedTickets}
          myPendingTickets={myPendingTickets}
          otherPendingTickets={otherPendingTickets}
          loadingMyTickets={loadingMyTickets || loadingCategories}
          loadingOtherTickets={loadingOtherTickets}
          errorMyTickets={errorMyTickets}
          errorOtherTickets={errorOtherTickets}
          categoryMap={categoryMap}
          usernames={usernames}
          isLabUser={isLabUser}
          onSelectTask={setSelectedTask}
          onSelectTicket={setSelectedTicket}
        />
      </div>

      {selectedTask && (
        <TaskSlideup
          task={selectedTask}
          categoryMap={categoryMap}
          usernames={usernames}
          currentUserId={currentAccount?.id ?? null}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {selectedTicket && (
        <TicketSlideup
          ticket={selectedTicket}
          categoryMap={categoryMap}
          usernames={usernames}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </main>
  );
}
