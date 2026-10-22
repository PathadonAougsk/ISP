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
import { formatCount, getRoom } from "@/components/dashboard/dashboard_utils";

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

    return othersOnly.slice(0, getRoom(MAX_TASK + 1, myTasks.length));
  }, [loadingMyTasks, myTasks.length, othersOnly]);

  const showLoadingOtherTasks =
    loadingOtherTasks && (loadingMyTasks || myTasks.length <= MAX_TASK);

  // lists show max only, the extra item is just for count
  const shownMyTasks = useMemo(() => myTasks.slice(0, MAX_TASK), [myTasks]);

  const otherTaskRoom = getRoom(MAX_TASK, myTasks.length);

  const shownOtherTasks = useMemo(
    () => visibleOtherTasks.slice(0, otherTaskRoom),
    [otherTaskRoom, visibleOtherTasks],
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
  const ticketRoom = getRoom(
    MAX_TICKET,
    shownMyRejectedTickets.length,
    shownMyPendingTickets.length,
  );

  const shownOtherRejectedTickets = useMemo(
    () => otherRejectedTickets.slice(0, ticketRoom),
    [otherRejectedTickets, ticketRoom],
  );

  const pendingRoom = getRoom(ticketRoom, shownOtherRejectedTickets.length);

  const shownOtherPendingTickets = useMemo(
    () => otherPendingTickets.slice(0, pendingRoom),
    [otherPendingTickets, pendingRoom],
  );

  // label counting
  const listCounts = {
    myTasks: formatCount(myTasks.length, MAX_TASK),
    otherTasks: formatCount(visibleOtherTasks.length, otherTaskRoom),
    myRejectedTickets: formatCount(myRejectedTickets.length, MAX_TICKET),
    myPendingTickets: formatCount(myPendingTickets.length, MAX_TICKET),
    otherRejectedTickets: formatCount(otherRejectedTickets.length, ticketRoom),
    otherPendingTickets: formatCount(otherPendingTickets.length, pendingRoom),
  };

  // summary and overview use same items as the list. mine first, others fill remaining room
  const viewItems = isTicketView
    ? [
        ...shownMyRejectedTickets,
        ...shownMyPendingTickets,
        ...(isAllScope
          ? [...shownOtherRejectedTickets, ...shownOtherPendingTickets]
          : []),
      ]
    : [...shownMyTasks, ...(isAllScope ? shownOtherTasks : [])];

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
            items={viewItems}
            loadingTasks={loadingViewItems || errorViewItems}
            view={view}
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
            counts={listCounts}
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
