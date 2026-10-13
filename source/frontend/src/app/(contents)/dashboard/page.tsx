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
  ScopeToggle,
  type DashboardScope,
  type DashboardView,
} from "@/components/dashboard/view_toggle";
import { useDashboardFetching } from "@/components/dashboard/dashboard_fetching";

const MAX_TASK = 30;
const MAX_TICKET = 30;

export default function Dashboard() {
  const { account: currentAccount, loading: accountLoading } =
    useCurrentAccount();

  const {
    myTasks,
    otherTasks,
    categories,
    myRejectedTickets,
    myPendingTickets,
    otherRejectedTickets,
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
    reloadTasks,
  } = useDashboardFetching(
    currentAccount,
    accountLoading,
    MAX_TASK,
    MAX_TICKET,
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

  const othersOnly = useMemo(() => {
    const myTaskIds = new Set(myTasks.map((task) => task.id));

    // remove dupe tasks
    return otherTasks.filter((task) => !myTaskIds.has(task.id));
  }, [myTasks, otherTasks]);

  // keep one extra item, so count can show max+
  const visibleOtherTasks = useMemo(() => {
    if (loadingMyTasks) return [];

    return othersOnly.slice(0, Math.max(MAX_TASK + 1 - myTasks.length, 0));
  }, [loadingMyTasks, myTasks.length, othersOnly]);

  const showLoadingOtherTasks =
    loadingOtherTasks && (loadingMyTasks || myTasks.length <= MAX_TASK);

  // lists show max only, the extra item is just for count
  const shownMyTasks = useMemo(() => myTasks.slice(0, MAX_TASK), [myTasks]);

  const shownOtherTasks = useMemo(
    () => visibleOtherTasks.slice(0, Math.max(MAX_TASK - myTasks.length, 0)),
    [myTasks.length, visibleOtherTasks],
  );

  const shownMyRejectedTickets = useMemo(
    () => myRejectedTickets.slice(0, MAX_TICKET),
    [myRejectedTickets],
  );

  const shownMyPendingTickets = useMemo(
    () => myPendingTickets.slice(0, MAX_TICKET),
    [myPendingTickets],
  );

  // others only fill the room that mine leave
  const ticketRoom = Math.max(
    MAX_TICKET - shownMyRejectedTickets.length - shownMyPendingTickets.length,
    0,
  );

  const shownOtherRejectedTickets = useMemo(
    () => otherRejectedTickets.slice(0, ticketRoom),
    [otherRejectedTickets, ticketRoom],
  );

  const shownOtherPendingTickets = useMemo(
    () =>
      otherPendingTickets.slice(
        0,
        ticketRoom - shownOtherRejectedTickets.length,
      ),
    [otherPendingTickets, ticketRoom, shownOtherRejectedTickets.length],
  );

  // summary and overview read from the selected view and scope
  const myItems = isTicketView ? myPendingTickets : myTasks;
  const otherItems = isTicketView ? otherPendingTickets : visibleOtherTasks;
  const viewItems = isAllScope ? [...myItems, ...otherItems] : myItems;
  const viewMax = isTicketView ? MAX_TICKET : MAX_TASK;

  const loadingViewItems = isTicketView
    ? loadingMyTickets || (isAllScope && loadingOtherTickets)
    : loadingMyTasks || (isAllScope && showLoadingOtherTasks);
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
            tasks={viewItems}
            loadingTasks={loadingViewItems || errorViewItems}
            view={view}
            rejectedCount={
              isAllScope
                ? myRejectedTickets.length + otherRejectedTickets.length
                : myRejectedTickets.length
            }
            max={viewMax}
          />

          <Overview
            tasks={viewItems.slice(0, viewMax)}
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
            loadingMyPendingTickets={loadingMyTickets || errorMyTickets}
            loadingMyRejectedTickets={loadingMyTickets || errorMyTickets}
            maxTask={MAX_TASK}
            maxTicket={MAX_TICKET}
          />
        </div>

        {/* list need own height when stacked */}
        <div className="order-last flex h-200 min-w-0 flex-col min-[1000px]:order-0 min-[1000px]:h-auto min-[1000px]:min-h-0 min-[1000px]:flex-1">
          <TaskTicketList
            myTasks={shownMyTasks}
            otherTasks={shownOtherTasks}
            loadingMyTasks={loadingMyTasks}
            loadingOtherTasks={showLoadingOtherTasks}
            errorMyTasks={errorMyTasks}
            errorOtherTasks={errorOtherTasks}
            myRejectedTickets={shownMyRejectedTickets}
            myPendingTickets={shownMyPendingTickets}
            otherRejectedTickets={shownOtherRejectedTickets}
            otherPendingTickets={shownOtherPendingTickets}
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
          currentUserId={currentAccount?.id ?? null}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </main>
  );
}
