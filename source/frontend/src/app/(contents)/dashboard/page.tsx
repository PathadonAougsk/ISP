"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  // every part loads on its own and shows as soon as it is ready
  const [loadingMyTasks, setLoadingMyTasks] = useState(true);
  const [loadingOtherTasks, setLoadingOtherTasks] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const maxTask = 20;
  const maxTicket = 20;

  // item opened in the popup (null = popup closed)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // id -> name lookup
  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  const isLabUser = currentAccount?.role === "Lab User";

  // other tasks fill to reach maxTask
  const visibleOtherTasks = useMemo(() => {
    if (loadingMyTasks) return [];
    const myTaskIds = new Set(myTasks.map((task) => task.id));
    return otherTasks
      .filter((task) => !myTaskIds.has(task.id))
      .slice(0, Math.max(maxTask - myTasks.length, 0));
  }, [loadingMyTasks, myTasks, otherTasks]);

  // lab user not load and my task length = 20 doesn't load
  const showLoadingOtherTasks =
    !isLabUser && loadingOtherTasks && (loadingMyTasks || myTasks.length < maxTask);

  // fetch the account names one by one, each name shows when it arrives
  const addUsernames = useCallback((userIds: string[]) => {
    new Set(userIds).forEach((userId) => {
      getUsername(userId).then((username) => {
        setUsernames((prev) => (prev[userId] === username ? prev : { ...prev, [userId]: username }));
      });
    });
  }, []);

  // get my tasks
  useEffect(() => {
    if (currentAccount === null) return;

    let cancelled = false;

    getTasks({
      status: "in_progress",
      assignsTo: currentAccount.id,
      limit: maxTask,
    })
      .then(({ Tasks }) => {
        if (!cancelled) setMyTasks(Tasks);
      })
      .catch(() => {
        if (!cancelled) setMyTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMyTasks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccount]);

  // get other tasks (not for lab users)
  useEffect(() => {
    if (currentAccount === null || currentAccount.role === "Lab User") return;

    let cancelled = false;

    getTasks({
      status: "in_progress",
      limit: maxTask,
    })
      .then(({ Tasks }) => {
        if (!cancelled) setOtherTasks(Tasks);
      })
      .catch(() => {
        if (!cancelled) setOtherTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOtherTasks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccount]);

  // get categories
  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then(({ Categories }) => {
        if (!cancelled) setCategories(Categories);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // get ticket
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { Tickets } = await getTickets({ status: "pending", limit: maxTicket });

        if (cancelled) return;
        setTickets(Tickets);
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

  // get the creator names for whatever is on screen
  useEffect(() => {
    addUsernames([
      ...myTasks.map((task) => task.created_by),
      ...visibleOtherTasks.map((task) => task.created_by),
      ...tickets.map((ticket) => ticket.created_by),
    ]);
  }, [myTasks, visibleOtherTasks, tickets, addUsernames]);

  return (
    <main className="flex min-h-full w-full gap-5 overflow-x-auto bg-(--background) px-5 pt-5">
      <div className="flex w-[40%] min-w-120 max-w-300 shrink-0 flex-col gap-5">
        <Announcement />
        <ActiveTask tasks={myTasks} loadingTasks={loadingMyTasks} />
        <TaskOverview
          tasks={myTasks}
          loadingTasks={loadingMyTasks || loadingCategories}
          categoryMap={categoryMap}
        />
      </div>

      <TaskTicketList
        myTasks={myTasks}
        otherTasks={visibleOtherTasks}
        loadingMyTasks={loadingMyTasks}
        loadingOtherTasks={showLoadingOtherTasks}
        tickets={tickets}
        loadingTickets={loadingTickets || loadingCategories}
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
