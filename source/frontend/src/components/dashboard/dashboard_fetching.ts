"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccounts, type Account } from "@/lib/account";
import { getCategories, type Category } from "@/lib/category";
import { getTasks, type GetTasksParams, type Task } from "@/lib/task";
import { getTickets, type Ticket } from "@/lib/ticket";
import { getRoom } from "@/components/dashboard/dashboard_utils";

const CACHE_MS = 60_000;

// share one request between callers. retry after a failure or after CACHE_MS

function cachedRequest<T>(load: () => Promise<T>) {
  let request: Promise<T | null> | null = null;
  let loadedAt = 0;
  let pending = false;

  return () => {
    if (request === null || (!pending && Date.now() - loadedAt > CACHE_MS)) {
      pending = true;

      const next: Promise<T | null> = load()
        .then((result) => {
          if (request === next) {
            loadedAt = Date.now();
            pending = false;
          }

          return result;
        })
        .catch(() => {
          if (request === next) {
            request = null;
            pending = false;
          }

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

function sortByDueDate<T extends { id: number; due_date: string | null }>(
  items: T[],
) {
  return [...items].sort(compareByDueDate);
}

// loading + error flag, one pair for each request group
type Resource = "myTasks" | "otherTasks" | "myTickets" | "otherTickets";
type Flags = { loading: boolean; error: boolean };
type SetFlag = (key: Resource, patch: Partial<Flags>) => void;

const initialFlags: Record<Resource, Flags> = {
  myTasks: { loading: true, error: false },
  otherTasks: { loading: true, error: false },
  myTickets: { loading: true, error: false },
  otherTickets: { loading: true, error: false },
};

const resources = Object.keys(initialFlags) as Resource[];

// same flow for every group. cancelled = ignore everything
async function runLoad(
  key: Resource,
  setFlag: SetFlag,
  isCancelled: () => boolean,
  load: () => Promise<void>,
  reset: () => void,
) {
  try {
    await load();

    if (isCancelled()) return;

    setFlag(key, { error: false });
  } catch {
    if (isCancelled()) return;

    reset();
    setFlag(key, { error: true });
  } finally {
    if (!isCancelled()) setFlag(key, { loading: false });
  }
}

export function useDashboardFetching(
  currentAccount: Account | null,
  accountLoading: boolean,
  maxTask: number,
  maxTicket: number,
) {
  const accountId = currentAccount?.id;
  const accountRole = currentAccount?.role;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(false);

  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [myRejectedTickets, setMyRejectedTickets] = useState<Ticket[]>([]);
  const [myPendingTickets, setMyPendingTickets] = useState<Ticket[]>([]);
  const [otherRejectedTickets, setOtherRejectedTickets] = useState<Ticket[]>(
    [],
  );
  const [otherPendingTickets, setOtherPendingTickets] = useState<Ticket[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [creatorRoles, setCreatorRoles] = useState<Record<string, string>>({});

  const [flags, setFlags] = useState(initialFlags);

  // patch one group only, other groups stay same
  const setFlag = useCallback<SetFlag>((key, patch) => {
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  // bump to refetch tasks, loading flags stay false so no flicker
  const [tasksReloadKey, setTasksReloadKey] = useState(0);
  // same for tickets, tasks are not touched
  const [ticketsReloadKey, setTicketsReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // null mean request failed
    loadCategories().then((loaded) => {
      if (cancelled) return;

      if (loaded) {
        setCategories(loaded);
        setErrorCategories(false);
      } else {
        setErrorCategories(true);
      }

      setLoadingCategories(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (accountId === undefined) return;

    let cancelled = false;

    const run = (key: Resource, load: () => Promise<void>, reset: () => void) =>
      runLoad(key, setFlag, () => cancelled, load, reset);

    async function loadTasks(
      params: GetTasksParams,
      key: Resource,
      setTasks: (tasks: Task[]) => void,
    ): Promise<Task[]> {
      let loaded: Task[] = [];

      await run(
        key,
        async () => {
          const { Tasks } = await getTasks(params);

          if (cancelled) return;

          loaded = sortByDueDate(Tasks);
          setTasks(loaded);
        },
        () => setTasks([]),
      );

      return loaded;
    }

    // load as sequence and with only needed amount
    // limit = max + 1
    async function loadAllTasks(userId: string) {
      const mine = await loadTasks(
        {
          status: "in_progress",
          assignsTo: userId,
          limit: maxTask + 1,
        },
        "myTasks",
        setMyTasks,
      );

      // lab user cant see others' tasks
      if (cancelled || accountRole === "Lab User") return;

      // my tasks already over the max, skip the request
      if (mine.length > maxTask) {
        setFlag("otherTasks", { loading: false });
        return;
      }

      // load others' task and remove the dupe
      await loadTasks(
        {
          status: "in_progress",
          limit: maxTask + 1,
        },
        "otherTasks",
        setOtherTasks,
      );
    }

    setFlag("otherTasks", { error: false });
    loadAllTasks(accountId);

    return () => {
      cancelled = true;
    };
  }, [accountId, accountRole, maxTask, tasksReloadKey, setFlag]);

  useEffect(() => {
    if (accountId === undefined) return;

    let cancelled = false;

    const run = (key: Resource, load: () => Promise<void>, reset: () => void) =>
      runLoad(key, setFlag, () => cancelled, load, reset);

    // my rejected -> my pending -> others' rejected -> others' pending
    // limit = max + 1
    async function loadTickets() {
      let rejectedCount = 0;
      let myPending: Ticket[] = [];

      await run(
        "myTickets",
        async () => {
          const { Tickets: rejected } = await getTickets({
            status: "rejected",
            onlyOwned: true,
            limit: maxTicket + 1,
          });

          if (cancelled) return;

          rejectedCount = rejected.length;
          setMyRejectedTickets(sortByDueDate(rejected));

          // always load pending (for ticket overview)
          const { Tickets: pending } = await getTickets({
            status: "pending",
            onlyOwned: true,
            limit: maxTicket + 1,
          });

          if (cancelled) return;

          myPending = sortByDueDate(pending);
          setMyPendingTickets(myPending);
        },
        () => {
          rejectedCount = 0;
          myPending = [];
          setMyRejectedTickets([]);
          setMyPendingTickets([]);
        },
      );

      // lab user cant see others' tickets
      if (cancelled || accountRole === "Lab User") return;

      const room = getRoom(maxTicket + 1, rejectedCount, myPending.length);

      // my tickets already over the max, skip the request
      if (room <= 0) {
        setFlag("otherTickets", { loading: false });
        return;
      }

      await run(
        "otherTickets",
        async () => {
          // others' rejected first, room already > 0 here
          const { Tickets: otherRejected } = await getTickets({
            status: "rejected",
            notOwned: true,
            limit: maxTicket + 1 - rejectedCount,
          });

          if (cancelled) return;

          const rejectedShown = sortByDueDate(otherRejected).slice(0, room);
          setOtherRejectedTickets(rejectedShown);

          const pendingRoom = getRoom(room, rejectedShown.length);

          // others' rejected fill the room, skip the request
          if (pendingRoom > 0) {
            const { Tickets: otherPending } = await getTickets({
              status: "pending",
              notOwned: true,
              limit: maxTicket + 1 - myPending.length,
            });

            if (cancelled) return;

            setOtherPendingTickets(
              sortByDueDate(otherPending).slice(0, pendingRoom),
            );
          } else {
            setOtherPendingTickets([]);
          }
        },
        () => {
          setOtherRejectedTickets([]);
          setOtherPendingTickets([]);
        },
      );
    }

    setFlag("otherTickets", { error: false });
    loadTickets();

    return () => {
      cancelled = true;
    };
  }, [accountId, accountRole, maxTicket, ticketsReloadKey, setFlag]);

  useEffect(() => {
    const userIds = [
      ...myTasks.map((task) => task.created_by),
      ...otherTasks.map((task) => task.created_by),
      ...myRejectedTickets.map((ticket) => ticket.created_by),
      ...myPendingTickets.map((ticket) => ticket.created_by),
      ...otherRejectedTickets.map((ticket) => ticket.created_by),
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

      const roles = new Map(
        accounts.map((account): [string, string] => [account.id, account.role]),
      );

      const nextUsernames: Record<string, string> = {};
      const nextRoles: Record<string, string> = {};

      uniqueIds.forEach((userId) => {
        nextUsernames[userId] = names.get(userId) ?? userId;

        const role = roles.get(userId);
        if (role) nextRoles[userId] = role;
      });

      setUsernames((prev) => ({ ...prev, ...nextUsernames }));
      setCreatorRoles((prev) => ({ ...prev, ...nextRoles }));
    });

    return () => {
      cancelled = true;
    };
  }, [
    myTasks,
    otherTasks,
    myRejectedTickets,
    myPendingTickets,
    otherRejectedTickets,
    otherPendingTickets,
  ]);

  useEffect(() => {
    if (accountLoading || currentAccount !== null) return;

    resources.forEach((key) => setFlag(key, { loading: false, error: true }));
  }, [accountLoading, currentAccount, setFlag]);

  return {
    myTasks,
    otherTasks,
    categories,
    myRejectedTickets,
    myPendingTickets,
    otherRejectedTickets,
    otherPendingTickets,
    usernames,
    creatorRoles,
    loadingMyTasks: flags.myTasks.loading,
    loadingOtherTasks: flags.otherTasks.loading && accountRole !== "Lab User",
    loadingCategories,
    loadingMyTickets: flags.myTickets.loading,
    loadingOtherTickets:
      flags.otherTickets.loading && accountRole !== "Lab User",
    errorMyTasks: flags.myTasks.error,
    errorOtherTasks: flags.otherTasks.error,
    errorCategories,
    errorMyTickets: flags.myTickets.error,
    errorOtherTickets: flags.otherTickets.error,
    reloadTasks: () => setTasksReloadKey((key) => key + 1),
    reloadTickets: () => setTicketsReloadKey((key) => key + 1),
  };
}
