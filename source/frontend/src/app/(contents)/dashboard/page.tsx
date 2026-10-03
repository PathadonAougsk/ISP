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

// cache (same user is only fetched once)
const usernameRequests = new Map<string, Promise<string>>();

function getUsername(userId: string) {
  let request = usernameRequests.get(userId);
  if (!request) {
    request = getAccount(userId)
      .then((user) => user?.username ?? userId)
      .catch(() => {
        usernameRequests.delete(userId);
        return userId;
      });
    usernameRequests.set(userId, request);
  }
  return request;
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

  const maxTask = 20;
  const maxTicket = 20;

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
    if (currentAccount === null) return;

    let cancelled = false;

    async function load() {
      try {
        if (currentAccount === null) return;

        const categoriesPromise = getCategories().catch(() => ({ Categories: [] as Category[] }));

        const [{ Tasks: myTasks }, { Tasks: otherTasks }] = await Promise.all([
          getTasks({
            status: "in_progress",
            assignsTo: currentAccount.id,
            limit: maxTask,
          }),
          currentAccount.role !== "Lab User"
            ? getTasks({
              status: "in_progress",
              limit: maxTask,
            })
            : Promise.resolve({ Tasks: [] }),
        ]);

        const { Categories } = await categoriesPromise;

        const myTaskIds = new Set(myTasks.map((task) => task.id));
        const Tasks = [
          ...myTasks,
          ...otherTasks.filter((task) => !myTaskIds.has(task.id)),
        ].slice(0, maxTask);

        const uniqueAccountIds = [...new Set(Tasks.map((task) => task.created_by))];
        const accountEntries = await Promise.all(
          uniqueAccountIds.map(async (userId) => [userId, await getUsername(userId)] as const)
        );

        if (cancelled) return;
        setTasks(Tasks);
        setCategories(Categories);
        setUsernames((prev) => ({ ...prev, ...Object.fromEntries(accountEntries) }));
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
  }, [currentAccount]);

  // get ticket
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { Tickets } = await getTickets({ status: "pending", limit: maxTicket });

        const uniqueAccountIds = [...new Set(Tickets.map((ticket) => ticket.created_by))];
        const accountEntries = await Promise.all(
          uniqueAccountIds.map(async (userId) => [userId, await getUsername(userId)] as const)
        );

        if (cancelled) return;
        setTickets(Tickets);
        setUsernames((prev) => ({ ...prev, ...Object.fromEntries(accountEntries) }));
      } catch {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setLoadingTickets(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-120 max-w-300 shrink-0 flex-col gap-5">
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
          usernames={usernames}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </main>
  );
}
