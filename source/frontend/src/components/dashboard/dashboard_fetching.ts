"use client";

import { useEffect, useState } from "react";
import { getAccounts, type Account } from "@/lib/account";
import { getCategories, type Category } from "@/lib/category";
import { getTasks, type Task } from "@/lib/task";
import { getTickets, type Ticket } from "@/lib/ticket";

const CACHE_MS = 60_000;

// share one request between callers. retry after a failure or after CACHE_MS
function cachedRequest<T>(load: () => Promise<T>) {
  let request: Promise<T | null> | null = null;
  let loadedAt = 0;

  return () => {
    if (request === null || Date.now() - loadedAt > CACHE_MS) {
      loadedAt = Date.now();
      const next: Promise<T | null> = load().catch(() => {
        if (request === next) request = null;
        return null;
      });
      request = next;
    }

    return request;
  };
}

const loadAccounts = cachedRequest(() =>
  getAccounts().then(({ Accounts }) => Accounts),
);

const loadCategories = cachedRequest(() =>
  getCategories().then(({ Categories }) => Categories),
);

// due date asc, null last. both null or same date, sort by id asc
function compareByDueDate<T extends { id: number; due_date: string | null }>(
  a: T,
  b: T,
) {
  if (a.due_date === null && b.due_date === null) return a.id - b.id;
  if (a.due_date === null) return 1;
  if (b.due_date === null) return -1;

  const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  return diff !== 0 ? diff : a.id - b.id;
}

export function useDashboardFetching(
  currentAccount: Account | null,
  maxTask: number,
  maxTicket: number,
) {
  const accountId = currentAccount?.id;
  const accountRole = currentAccount?.role;

  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  const [loadingMyTasks, setLoadingMyTasks] = useState(true);
  const [loadingOtherTasks, setLoadingOtherTasks] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [errorMyTasks, setErrorMyTasks] = useState(false);
  const [errorOtherTasks, setErrorOtherTasks] = useState(false);
  const [errorCategories, setErrorCategories] = useState(false);
  const [errorTickets, setErrorTickets] = useState(false);

  useEffect(() => {
    if (accountId === undefined) return;

    let cancelled = false;

    getTasks({
      status: "in_progress",
      assignsTo: accountId,
      limit: maxTask,
    })
      .then(({ Tasks }) => {
        if (cancelled) return;

        setMyTasks([...Tasks].sort(compareByDueDate));
        setErrorMyTasks(false);
      })
      .catch(() => {
        if (cancelled) return;

        setMyTasks([]);
        setErrorMyTasks(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingMyTasks(false);
      });

    if (accountRole !== "Lab User") {
      getTasks({
        status: "in_progress",
        limit: maxTask,
      })
        .then(({ Tasks }) => {
          if (cancelled) return;

          setOtherTasks([...Tasks].sort(compareByDueDate));
          setErrorOtherTasks(false);
        })
        .catch(() => {
          if (cancelled) return;

          setOtherTasks([]);
          setErrorOtherTasks(true);
        })
        .finally(() => {
          if (!cancelled) setLoadingOtherTasks(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [accountId, accountRole, maxTask]);

  useEffect(() => {
    let cancelled = false;

    loadCategories().then((result) => {
      if (cancelled) return;

      if (result === null) setErrorCategories(true);
      else setCategories(result);

      setLoadingCategories(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (accountId === undefined) return;

    let cancelled = false;

    async function loadTickets() {
      try {
        if (accountRole === "Lab User") {
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
              .sort(compareByDueDate)
              .slice(0, maxTicket),
          );
        } else {
          const { Tickets } = await getTickets({
            status: "pending",
            limit: maxTicket,
          });

          if (cancelled) return;

          setTickets([...Tickets].sort(compareByDueDate));
        }

        setErrorTickets(false);
      } catch {
        if (cancelled) return;

        setTickets([]);
        setErrorTickets(true);
      } finally {
        if (!cancelled) setLoadingTickets(false);
      }
    }

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, [accountId, accountRole, maxTicket]);

  useEffect(() => {
    const userIds = [
      ...myTasks.map((task) => task.created_by),
      ...otherTasks.map((task) => task.created_by),
      ...tickets.map((ticket) => ticket.created_by),
    ];

    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return;

    let cancelled = false;

    loadAccounts().then((accounts) => {
      if (cancelled || !accounts) return;

      const names = new Map(
        accounts.map((account): [string, string] => [
          account.id,
          account.username,
        ]),
      );
      const nextUsernames: Record<string, string> = {};

      uniqueIds.forEach((userId) => {
        nextUsernames[userId] = names.get(userId) ?? userId;
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
    loadingOtherTasks: loadingOtherTasks && accountRole !== "Lab User", // lab users never waiting for other tasks
    loadingCategories,
    loadingTickets,
    errorMyTasks,
    errorOtherTasks,
    errorCategories,
    errorTickets,
  };
}
