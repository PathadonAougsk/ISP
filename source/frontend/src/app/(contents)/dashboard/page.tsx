"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccount } from "@/lib/account";
import { useCurrentAccount } from "@/components/account";
import { getCategories, toCategoryMap, type Category } from "@/components/category";
import { getTasks, type Task } from "@/components/task";
import { getTickets, type Ticket } from "@/components/ticket";
import Announcement from "@/components/dashboard/announcement";
import ActiveTask from "@/components/dashboard/active_task";
import TaskOverview from "@/components/dashboard/task_overview";
import TaskTicketList from "@/components/dashboard/task_ticket_list";
import TaskPopup from "@/components/dashboard/task_popup";
import TicketPopup from "@/components/dashboard/ticket_popup";

export type DueBucketKey = "thisWeek" | "nextWeek" | "later";

export function getWeekBounds(date: Date) {
  const day = date.getUTCDay();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
  return { start, end };
}

export function getDueBucket(dueDateIso: string | null, now: Date): DueBucketKey {
  if (dueDateIso === null) return "later";

  const due = new Date(dueDateIso);
  const { end: thisWeekEnd } = getWeekBounds(now);
  const nextWeekEnd = new Date(Date.UTC(thisWeekEnd.getUTCFullYear(), thisWeekEnd.getUTCMonth(), thisWeekEnd.getUTCDate() + 7, 23, 59, 59, 999));

  if (due <= thisWeekEnd) return "thisWeek";
  if (due <= nextWeekEnd) return "nextWeek";
  return "later";
}

export default function Dashboard() {
  const { account: currentAccount } = useCurrentAccount();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  // true until tasks + categories + account names are all ready
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // item opened in the popup (null = popup closed)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // id -> name lookup
  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  const assignedTasks = useMemo(
    () => currentAccount === null ? [] : tasks.filter((task) => task.assignees.some((assignee) => assignee.id === currentAccount.id)),
    [tasks, currentAccount]
  );

  // get tasks + categories
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ Tasks }, { Categories }] = await Promise.all([
          getTasks({ status: "in_progress", limit: 50 }),
          getCategories().catch(() => ({ Categories: [] as Category[] })),
        ]);

        const uniqueAccountIds = [...new Set(Tasks.map((task) => task.created_by))];
        const accountEntries = await Promise.all(
          uniqueAccountIds.map(async (userId) => {
            try {
              const user = await getAccount(userId);
              return [userId, user?.username ?? userId] as const;
            } catch {
              return [userId, userId] as const;
            }
          })
        );

        if (cancelled) return;
        setTasks(Tasks);
        setCategories(Categories);
        setUsernames(Object.fromEntries(accountEntries));
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoadingTasks(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // get ticket
  useEffect(() => {
    getTickets({ status: "pending", limit: 50 })
      .then(({ Tickets }) => setTickets(Tickets))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, []);

  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-100 max-w-300 shrink-0 flex-col gap-5">
        <Announcement />
        <ActiveTask tasks={assignedTasks} loadingTasks={loadingTasks} />
        <TaskOverview
          tasks={assignedTasks}
          loadingTasks={loadingTasks}
          categoryMap={categoryMap}
        />
      </div>

      <TaskTicketList
        tasks={tasks}
        loadingTasks={loadingTasks}
        tickets={tickets}
        loadingTickets={loadingTickets || loadingTasks}
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
          onClose={() => setSelectedTask(null)}
        />
      )}

      {selectedTicket && (
        <TicketPopup
          ticket={selectedTicket}
          categoryMap={categoryMap}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </main>
  );
}
