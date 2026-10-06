"use client";

import { useMemo, useState } from "react";
import { useCurrentAccount } from "@/lib/current_account";
import { toCategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import type { Ticket } from "@/lib/ticket";
import Announcement from "@/components/dashboard/announcement";
import Missing from "@/components/dashboard/missing";
import ActiveTask from "@/components/dashboard/active_task";
import TaskOverview from "@/components/dashboard/task_overview";
import TaskTicketList from "@/components/dashboard/task_ticket_list";
import TaskPopup from "@/components/dashboard/task_popup";
import TicketPopup from "@/components/dashboard/ticket_popup";
import { useDashboardFetching } from "@/components/dashboard/dashboard_fetching";

const MAX_TASK = 30;
const MAX_TICKET = 30;

export default function Dashboard() {
  const { account: currentAccount } = useCurrentAccount();

  const {
    myTasks,
    otherTasks,
    categories,
    tickets,
    usernames,
    loadingMyTasks,
    loadingOtherTasks,
    loadingCategories,
    loadingTickets,
    errorMyTasks,
    errorOtherTasks,
    errorCategories,
    errorTickets,
  } = useDashboardFetching(currentAccount, MAX_TASK, MAX_TICKET);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  const isLabUser = currentAccount?.role === "Lab User";

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
      <div className="flex w-[40%] min-w-120 max-w-300 shrink-0 flex-col gap-5">
        <Announcement />
        <Missing
          myTasks={myTasks}
          otherTasks={othersOnly}
          tickets={tickets}
          loadingMyTasks={loadingMyTasks || errorMyTasks}
          loadingOtherTasks={loadingOtherTasks || errorOtherTasks}
          loadingTickets={loadingTickets || errorTickets}
          isLabUser={isLabUser}
        />
        <ActiveTask
          tasks={myTasks}
          loadingTasks={loadingMyTasks || errorMyTasks}
        />
        <TaskOverview
          tasks={myTasks}
          loadingTasks={loadingMyTasks || loadingCategories}
          errorTasks={errorMyTasks}
          errorCategories={errorCategories}
          categoryMap={categoryMap}
        />
      </div>

      <TaskTicketList
        myTasks={myTasks}
        otherTasks={visibleOtherTasks}
        loadingMyTasks={loadingMyTasks}
        loadingOtherTasks={showLoadingOtherTasks}
        errorMyTasks={errorMyTasks}
        errorOtherTasks={errorOtherTasks}
        tickets={tickets}
        loadingTickets={loadingTickets || loadingCategories}
        errorTickets={errorTickets}
        categoryMap={categoryMap}
        usernames={usernames}
        isLabUser={isLabUser}
        onSelectTask={setSelectedTask}
        onSelectTicket={setSelectedTicket}
      />

      {selectedTask && (
        <TaskPopup
          task={selectedTask}
          categoryMap={categoryMap}
          usernames={usernames}
          currentUserId={currentAccount?.id ?? null}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {selectedTicket && (
        <TicketPopup
          ticket={selectedTicket}
          categoryMap={categoryMap}
          usernames={usernames}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </main>
  );
}
