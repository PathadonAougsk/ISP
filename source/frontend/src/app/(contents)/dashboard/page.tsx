"use client";

import { useMemo, useState } from "react";
import { useCurrentAccount } from "@/lib/current_account";
import { toCategoryMap } from "@/lib/category";
import type { Task } from "@/lib/task";
import Announcement from "@/components/dashboard/announcement";
import ActiveTask from "@/components/dashboard/active_task";
import TaskOverview from "@/components/dashboard/task_overview";
import TaskTicketList from "@/components/dashboard/task_ticket_list";
import TaskPopup from "@/components/dashboard/task_popup";
import TicketPopup from "@/components/dashboard/ticket_popup";
import { useDashboardFetching } from "@/components/dashboard/fetching";

export default function Dashboard() {
  const { account: currentAccount } = useCurrentAccount();

  const maxTask = 20;
  const maxTicket = 20;

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
  } = useDashboardFetching(currentAccount, maxTask, maxTicket);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<
    (typeof tickets)[number] | null
  >(null);

  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  const isLabUser = currentAccount?.role === "Lab User";

  const visibleOtherTasks = useMemo(() => {
    if (loadingMyTasks) return [];

    const myTaskIds = new Set(myTasks.map((task) => task.id));

    return otherTasks
      .filter((task) => !myTaskIds.has(task.id))
      .slice(0, Math.max(maxTask - myTasks.length, 0));
  }, [loadingMyTasks, myTasks, otherTasks]);

  const showLoadingOtherTasks =
    !isLabUser &&
    loadingOtherTasks &&
    (loadingMyTasks || myTasks.length < maxTask);

  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-120 max-w-300 shrink-0 flex-col gap-5">
        <Announcement />
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
        currentAccount={currentAccount}
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
