"use client";

import { useEffect, useState } from "react";
import { getAccounts, type Account } from "@/lib/account";
import { getCategories, type Category } from "@/lib/category";
import { getTasks, type GetTasksParams, type Task } from "@/lib/task";
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
  const [myRejectedTickets, setMyRejectedTickets] = useState<Ticket[]>([]);
  const [myPendingTickets, setMyPendingTickets] = useState<Ticket[]>([]);
  const [otherPendingTickets, setOtherPendingTickets] = useState<Ticket[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  const [loadingMyTasks, setLoadingMyTasks] = useState(true);
  const [loadingOtherTasks, setLoadingOtherTasks] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingMyTickets, setLoadingMyTickets] = useState(true);
  const [loadingOtherTickets, setLoadingOtherTickets] = useState(true);

  const [errorMyTasks, setErrorMyTasks] = useState(false);
  const [errorOtherTasks, setErrorOtherTasks] = useState(false);
  const [errorCategories, setErrorCategories] = useState(false);
  const [errorMyTickets, setErrorMyTickets] = useState(false);
  const [errorOtherTickets, setErrorOtherTickets] = useState(false);

  useEffect(() => {
    if (accountId === undefined) return;

    let cancelled = false;

    async function loadTasks(
      params: GetTasksParams,
      setTasks: (tasks: Task[]) => void,
      setError: (error: boolean) => void,
      setLoading: (loading: boolean) => void,
    ): Promise<Task[]> {
      let loaded: Task[] = [];

      try {
        const { Tasks } = await getTasks(params);

        if (cancelled) return [];

        loaded = [...Tasks].sort(compareByDueDate);
        setTasks(loaded);
        setError(false);
      } catch {
        if (cancelled) return [];

        setTasks([]);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }

      return loaded;
    }

    // load as sequence and with only needed amount
    async function loadAllTasks(userId: string) {
      const mine = await loadTasks(
        {
          status: "in_progress",
          assignsTo: userId,
          limit: maxTask,
        },
        setMyTasks,
        setErrorMyTasks,
        setLoadingMyTasks,
      );

      // lab user cant see others' tasks
      if (cancelled || accountRole === "Lab User") return;

      // my tasks already fill the max, skip the request
      if (mine.length >= maxTask) {
        setLoadingOtherTasks(false);
        return;
      }

      // load others' task and remove the dupe
      await loadTasks(
        {
          status: "in_progress",
          limit: maxTask,
        },
        setOtherTasks,
        setErrorOtherTasks,
        setLoadingOtherTasks,
      );
    }

    loadAllTasks(accountId);

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

    // my rejected -> my pending -> others' pending
    async function loadTickets(userId: string) {
      let rejectedCount = 0;
      let myPending: Ticket[] = [];

      try {
        const { Tickets: rejected } = await getTickets({
          status: "rejected",
          onlyOwned: true,
          limit: maxTicket,
        });

        if (cancelled) return;

        rejectedCount = rejected.length;
        setMyRejectedTickets([...rejected].sort(compareByDueDate));

        // skip load pending if already full
        if (rejectedCount < maxTicket) {
          const { Tickets: pending } = await getTickets({
            status: "pending",
            onlyOwned: true,
            limit: maxTicket - rejectedCount,
          });

          if (cancelled) return;

          myPending = [...pending].sort(compareByDueDate);
          setMyPendingTickets(myPending);
        }

        setErrorMyTickets(false);
      } catch {
        if (cancelled) return;

        rejectedCount = 0;
        myPending = [];
        setMyRejectedTickets([]);
        setMyPendingTickets([]);
        setErrorMyTickets(true);
      } finally {
        if (!cancelled) setLoadingMyTickets(false);
      }

      // lab user cant see others' tickets
      if (cancelled || accountRole === "Lab User") return;

      const room = maxTicket - rejectedCount - myPending.length;

      // my tickets already fill the max, skip the request
      if (room <= 0) {
        setLoadingOtherTickets(false);
        return;
      }

      try {
        // load others' ticket and remove the dupe
        const { Tickets } = await getTickets({
          status: "pending",
          limit: maxTicket - rejectedCount,
        });

        if (cancelled) return;

        setOtherPendingTickets(
          Tickets.filter((ticket) => ticket.created_by !== userId)
            .sort(compareByDueDate)
            .slice(0, room),
        );
        setErrorOtherTickets(false);
      } catch {
        if (cancelled) return;

        setOtherPendingTickets([]);
        setErrorOtherTickets(true);
      } finally {
        if (!cancelled) setLoadingOtherTickets(false);
      }
    }

    loadTickets(accountId);

    return () => {
      cancelled = true;
    };
  }, [accountId, accountRole, maxTicket]);

  useEffect(() => {
    const userIds = [
      ...myTasks.map((task) => task.created_by),
      ...otherTasks.map((task) => task.created_by),
      ...myRejectedTickets.map((ticket) => ticket.created_by),
      ...myPendingTickets.map((ticket) => ticket.created_by),
      ...otherPendingTickets.map((ticket) => ticket.created_by),
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
  }, [
    myTasks,
    otherTasks,
    myRejectedTickets,
    myPendingTickets,
    otherPendingTickets,
  ]);

  return {
    myTasks,
    otherTasks,
    categories,
    myRejectedTickets,
    myPendingTickets,
    otherPendingTickets,
    usernames,
    loadingMyTasks,
    loadingOtherTasks: loadingOtherTasks && accountRole !== "Lab User", // lab users never waiting for others' tasks
    loadingCategories,
    loadingMyTickets,
    loadingOtherTickets: loadingOtherTickets && accountRole !== "Lab User", // lab users never waiting for others' tickets
    errorMyTasks,
    errorOtherTasks,
    errorCategories,
    errorMyTickets,
    errorOtherTickets,
  };
}
