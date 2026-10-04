"use client";

import { useEffect, useState } from "react";
import { getAccounts, type Account } from "@/lib/account";
import { getCategories, type Category } from "@/lib/category";
import { getTasks, type Task } from "@/lib/task";
import { getTickets, type Ticket } from "@/lib/ticket";

const accountsRequest = getAccounts()
  .then(({ Accounts }) => Accounts)
  .catch(() => null);

export function useDashboardFetching(
  currentAccount: Account | null,
  maxTask: number,
  maxTicket: number,
) {
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  const [loadingMyTasks, setLoadingMyTasks] = useState(true);
  const [loadingOtherTasks, setLoadingOtherTasks] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    if (currentAccount === null) return;

    let cancelled = false;

    async function loadTasks() {
      try {
        if (currentAccount === null) return;

        const requests = [
          getTasks({
            status: "in_progress",
            assignsTo: currentAccount.id,
            limit: maxTask,
          }),
        ];

        if (currentAccount.role !== "Lab User") {
          requests.push(
            getTasks({
              status: "in_progress",
              limit: maxTask,
            }),
          );
        }

        const [myTasksResponse, otherTasksResponse] =
          await Promise.all(requests);

        if (cancelled) return;

        setMyTasks(myTasksResponse.Tasks);
        setLoadingMyTasks(false);

        if (otherTasksResponse) {
          setOtherTasks(otherTasksResponse.Tasks);
        } else {
          setOtherTasks([]);
        }

        setLoadingOtherTasks(false);
      } catch {
        if (cancelled) return;

        setMyTasks([]);
        setOtherTasks([]);
        setLoadingMyTasks(false);
        setLoadingOtherTasks(false);
      }
    }

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [currentAccount, maxTask]);

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

  useEffect(() => {
    if (currentAccount === null) return;

    let cancelled = false;

    async function loadTickets() {
      try {
        if (currentAccount === null) return;

        if (currentAccount.role === "Lab User") {
          const [{ Tickets: pendingTickets }, { Tickets: rejectedTickets }] =
            await Promise.all([
              getTickets({
                status: "pending",
                limit: maxTicket,
              }),
              getTickets({
                status: "rejected",
                limit: maxTicket,
              }),
            ]);

          if (cancelled) return;

          setTickets(
            [...pendingTickets, ...rejectedTickets]
              .sort((a, b) => {
                if (a.due_date === null) return 1;
                if (b.due_date === null) return -1;

                return (
                  new Date(a.due_date).getTime() -
                  new Date(b.due_date).getTime()
                );
              })
              .slice(0, maxTicket),
          );
        } else {
          const { Tickets } = await getTickets({
            status: "pending",
            limit: maxTicket,
          });

          if (!cancelled) setTickets(Tickets);
        }
      } catch {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setLoadingTickets(false);
      }
    }

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, [currentAccount, maxTicket]);

  useEffect(() => {
    const userIds = [
      ...myTasks.map((task) => task.created_by),
      ...otherTasks.map((task) => task.created_by),
      ...tickets.map((ticket) => ticket.created_by),
    ];

    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return;

    let cancelled = false;

    accountsRequest.then((accounts) => {
      if (cancelled || !accounts) return;

      const nextUsernames: Record<string, string> = {};

      uniqueIds.forEach((userId) => {
        nextUsernames[userId] =
          accounts.find((account) => account.id === userId)?.username ?? userId;
      });

      setUsernames((prev) => ({ ...prev, ...nextUsernames }));
    });

    return () => {
      cancelled = true;
    };
  }, [myTasks, otherTasks, tickets]);

  return {
    myTasks,
    otherTasks,
    categories,
    tickets,
    usernames,
    loadingMyTasks,
    loadingOtherTasks,
    loadingCategories,
    loadingTickets,
  };
}
