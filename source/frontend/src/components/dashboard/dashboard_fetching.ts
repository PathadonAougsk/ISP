"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAccounts, type Account, type AccountRole } from "@/lib/account";
import { getCategories, type Category } from "@/lib/category";
import { getTasks } from "@/lib/task";
import { getTickets } from "@/lib/ticket";
import {
  formatCount,
  type DashboardGroup,
  type DashboardItem,
  type DashboardLimits,
  type GroupState,
} from "@/components/dashboard/dashboard_status";

// limit of each list at first load
const INITIAL_LIMITS: DashboardLimits = {
  myTasks: 10,
  otherTasks: 10,
  myRejectedTickets: 10,
  myPendingTickets: 10,
  otherRejectedTickets: 10,
  otherPendingTickets: 10,
};

// limit increment when clicking Load More button
const INCREMENT = 10;

// due date asc, null last. both null or same date, sort by id asc
function sortByDueDate<T extends { id: number; due_date: string | null }>(
  items: T[],
) {
  return [...items].sort((a, b) => {
    if (a.due_date === null && b.due_date === null) return a.id - b.id;
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;

    const diff =
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });
}

// loading + error flag, one pair for each request group
// refreshing = any fetch running. only for disable Load More, never show loading text
type Resource = "categories" | DashboardGroup;
type Flags = { loading: boolean; error: boolean; refreshing: boolean };
type SetFlag = (key: Resource, patch: Partial<Flags>) => void;

const accountResources: DashboardGroup[] = [
  "myTasks",
  "otherTasks",
  "myRejectedTickets",
  "myPendingTickets",
  "otherRejectedTickets",
  "otherPendingTickets",
];

const initialFlags = Object.fromEntries(
  ["categories", ...accountResources].map((key) => [
    key,
    { loading: true, error: false, refreshing: false },
  ]),
) as Record<Resource, Flags>;

// same flow for every group. cancelled = ignore everything
async function runLoad(
  key: Resource,
  setFlag: SetFlag,
  isCancelled: () => boolean,
  load: () => Promise<void>,
  reset?: () => void,
) {
  setFlag(key, { refreshing: true });

  try {
    await load();

    if (isCancelled()) return;

    setFlag(key, { error: false });
  } catch {
    if (isCancelled()) return;

    reset?.();
    setFlag(key, { error: true });
  } finally {
    if (!isCancelled()) setFlag(key, { loading: false, refreshing: false });
  }
}

// fetch limit + 1, the extra item only tell that list is overflow
// the group own its limit. Load More fail = old items and old limit stay
function useGroup<T extends DashboardItem & { id: number }>(
  group: DashboardGroup,
  accountId: string | undefined,
  enabled: boolean,
  reloadKey: number,
  flag: Flags,
  setFlag: SetFlag,
  fetchItems: (accountId: string, limit: number) => Promise<T[]>,
): GroupState<T> {
  // keep the limit that items were fetched with, so old page stay right while refetch
  const [data, setData] = useState<{ items: T[]; limit: number }>({
    items: [],
    limit: INITIAL_LIMITS[group],
  });

  // latest fetcher and committed limit, so effect deps stay short
  const fetchRef = useRef(fetchItems);
  const limitRef = useRef(data.limit);
  // every load bump this. older load see the change and get ignored
  const requestRef = useRef(0);

  useEffect(() => {
    fetchRef.current = fetchItems;
  });

  // only the newest request can commit. failed one never touch old data
  const load = useCallback(
    (id: string, limit: number) => {
      const requestId = ++requestRef.current;
      const isStale = () => requestRef.current !== requestId;

      runLoad(group, setFlag, isStale, async () => {
        const items = await fetchRef.current(id, limit + 1);

        if (isStale()) return;

        limitRef.current = limit;
        setData({ items: sortByDueDate(items), limit });
      });
    },
    [group, setFlag],
  );

  // new account or role = start over
  useEffect(() => {
    setData((prev) => ({ items: [], limit: prev.limit }));
    setFlag(group, { loading: true, error: false });
  }, [accountId, enabled, group, setFlag]);

  useEffect(() => {
    if (accountId === undefined) return;

    // not allowed (lab user), skip the request
    if (!enabled) {
      setFlag(group, { loading: false, error: false, refreshing: false });
      return;
    }

    load(accountId, limitRef.current);

    return () => {
      requestRef.current += 1;
    };
  }, [accountId, enabled, group, reloadKey, setFlag, load]);

  const loadMore = useCallback(() => {
    if (accountId !== undefined) load(accountId, limitRef.current + INCREMENT);
  }, [accountId, load]);

  const items = useMemo(
    () => data.items.slice(0, data.limit),
    [data.items, data.limit],
  );

  return {
    items,
    all: data.items,
    overflow: data.items[data.limit] ?? null,
    count: formatCount(data.items.length, data.limit),
    loading: flag.loading,
    error: flag.error,
    refreshing: flag.refreshing,
    loadMore,
  };
}

export function useDashboardFetching(
  currentAccount: Account | null,
  accountLoading: boolean,
  accountError: string | null,
) {
  const accountId = currentAccount?.id;
  const accountRole = currentAccount?.role;

  // lab user cant see others' items
  const canSeeOthers = accountRole !== "Lab User";

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

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

    runLoad(
      "categories",
      setFlag,
      () => cancelled,
      async () => {
        const { Categories } = await getCategories();

        if (!cancelled) setCategories(Categories);
      },
      () => setCategories([]),
    );

    return () => {
      cancelled = true;
    };
  }, [setFlag]);

  useEffect(() => {
    let cancelled = false;

    // fail = names show "-", nothing else break
    getAccounts()
      .then(({ Accounts }) => {
        if (!cancelled) setAccounts(Accounts);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // fetch all at the same time, no more sequential
  const myTaskList = useGroup(
    "myTasks",
    accountId,
    true,
    tasksReloadKey,
    flags.myTasks,
    setFlag,
    async (id, limit) =>
      (await getTasks({ status: "in_progress", assignsTo: id, limit })).Tasks,
  );

  const otherTaskList = useGroup(
    "otherTasks",
    accountId,
    canSeeOthers,
    tasksReloadKey,
    flags.otherTasks,
    setFlag,
    async (id, limit) =>
      (await getTasks({ status: "in_progress", notassignsTo: id, limit }))
        .Tasks,
  );

  const myRejectedList = useGroup(
    "myRejectedTickets",
    accountId,
    true,
    ticketsReloadKey,
    flags.myRejectedTickets,
    setFlag,
    async (_id, limit) =>
      (await getTickets({ status: "rejected", onlyOwned: true, limit }))
        .Tickets,
  );

  const myPendingList = useGroup(
    "myPendingTickets",
    accountId,
    true,
    ticketsReloadKey,
    flags.myPendingTickets,
    setFlag,
    async (_id, limit) =>
      (await getTickets({ status: "pending", onlyOwned: true, limit })).Tickets,
  );

  const otherRejectedList = useGroup(
    "otherRejectedTickets",
    accountId,
    canSeeOthers,
    ticketsReloadKey,
    flags.otherRejectedTickets,
    setFlag,
    async (_id, limit) =>
      (await getTickets({ status: "rejected", notOwned: true, limit })).Tickets,
  );

  const otherPendingList = useGroup(
    "otherPendingTickets",
    accountId,
    canSeeOthers,
    ticketsReloadKey,
    flags.otherPendingTickets,
    setFlag,
    async (_id, limit) =>
      (await getTickets({ status: "pending", notOwned: true, limit })).Tickets,
  );

  useEffect(() => {
    if (accountLoading || currentAccount !== null) return;

    // request fail = error. signed out = empty lists, no error
    accountResources.forEach((key) =>
      setFlag(key, { loading: false, error: accountError !== null }),
    );
  }, [accountLoading, currentAccount, accountError, setFlag]);

  // id -> name / role, built from all accounts
  const usernames = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((account): [string, string] => [
          account.id,
          account.username,
        ]),
      ),
    [accounts],
  );

  const creatorRoles = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((account): [string, AccountRole] => [
          account.id,
          account.role,
        ]),
      ),
    [accounts],
  );

  return {
    // the six lists, each with items, count, flags and loadMore
    groups: {
      myTasks: myTaskList,
      otherTasks: otherTaskList,
      myRejectedTickets: myRejectedList,
      myPendingTickets: myPendingList,
      otherRejectedTickets: otherRejectedList,
      otherPendingTickets: otherPendingList,
    },
    categories,
    usernames,
    creatorRoles,
    loadingCategories: flags.categories.loading,
    errorCategories: flags.categories.error,
    reloadTasks: () => setTasksReloadKey((key) => key + 1),
    reloadTickets: () => setTicketsReloadKey((key) => key + 1),
  };
}

export type DashboardGroups = ReturnType<typeof useDashboardFetching>["groups"];
