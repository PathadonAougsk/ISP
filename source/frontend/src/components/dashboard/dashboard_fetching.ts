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
} from "@/components/dashboard/dashboard_status";

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
  reset: () => void,
) {
  setFlag(key, { refreshing: true });

  try {
    await load();

    if (isCancelled()) return;

    setFlag(key, { error: false });
  } catch {
    if (isCancelled()) return;

    reset();
    setFlag(key, { error: true });
  } finally {
    if (!isCancelled()) setFlag(key, { loading: false, refreshing: false });
  }
}

// fetch limit + 1, the extra item only tell that list is overflow
function useGroup<T extends DashboardItem & { id: number }>(
  group: DashboardGroup,
  accountId: string | undefined,
  enabled: boolean,
  limit: number,
  reloadKey: number,
  setFlag: SetFlag,
  fetchItems: (accountId: string, limit: number) => Promise<T[]>,
) {
  // keep the limit that items were fetched with, so old page stay right while refetch
  const [data, setData] = useState<{ items: T[]; limit: number }>({
    items: [],
    limit,
  });

  // latest fetcher, so effect deps stay short
  const fetchRef = useRef(fetchItems);

  useEffect(() => {
    fetchRef.current = fetchItems;
  });

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

    const id = accountId;
    let cancelled = false;

    runLoad(
      group,
      setFlag,
      () => cancelled,
      async () => {
        const items = await fetchRef.current(id, limit + 1);

        if (!cancelled) setData({ items: sortByDueDate(items), limit });
      },
      () => setData({ items: [], limit }),
    );

    return () => {
      cancelled = true;
    };
  }, [accountId, enabled, group, limit, reloadKey, setFlag]);

  const shown = useMemo(
    () => data.items.slice(0, data.limit),
    [data.items, data.limit],
  );

  return {
    all: data.items,
    shown,
    overflow: data.items[data.limit] ?? null,
    count: formatCount(data.items.length, data.limit),
  };
}

export function useDashboardFetching(
  currentAccount: Account | null,
  accountLoading: boolean,
  accountError: string | null,
  limits: DashboardLimits,
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
    limits.myTasks,
    tasksReloadKey,
    setFlag,
    async (id, limit) =>
      (await getTasks({ status: "in_progress", assignsTo: id, limit })).Tasks,
  );

  const otherTaskList = useGroup(
    "otherTasks",
    accountId,
    canSeeOthers,
    limits.otherTasks,
    tasksReloadKey,
    setFlag,
    async (id, limit) =>
      (await getTasks({ status: "in_progress", notassignsTo: id, limit }))
        .Tasks,
  );

  const myRejectedList = useGroup(
    "myRejectedTickets",
    accountId,
    true,
    limits.myRejectedTickets,
    ticketsReloadKey,
    setFlag,
    async (_id, limit) =>
      (await getTickets({ status: "rejected", onlyOwned: true, limit }))
        .Tickets,
  );

  const myPendingList = useGroup(
    "myPendingTickets",
    accountId,
    true,
    limits.myPendingTickets,
    ticketsReloadKey,
    setFlag,
    async (_id, limit) =>
      (await getTickets({ status: "pending", onlyOwned: true, limit })).Tickets,
  );

  const otherRejectedList = useGroup(
    "otherRejectedTickets",
    accountId,
    canSeeOthers,
    limits.otherRejectedTickets,
    ticketsReloadKey,
    setFlag,
    async (_id, limit) =>
      (await getTickets({ status: "rejected", notOwned: true, limit })).Tickets,
  );

  const otherPendingList = useGroup(
    "otherPendingTickets",
    accountId,
    canSeeOthers,
    limits.otherPendingTickets,
    ticketsReloadKey,
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

  const loadingMyTasks = flags.myTasks.loading;

  const myTicketFlags = [flags.myRejectedTickets, flags.myPendingTickets];
  const otherTicketFlags = [
    flags.otherRejectedTickets,
    flags.otherPendingTickets,
  ];

  // the extra item of each list, null = nothing more to load
  const overflowItems: Record<DashboardGroup, DashboardItem | null> = {
    myTasks: myTaskList.overflow,
    otherTasks: otherTaskList.overflow,
    myRejectedTickets: myRejectedList.overflow,
    myPendingTickets: myPendingList.overflow,
    otherRejectedTickets: otherRejectedList.overflow,
    otherPendingTickets: otherPendingList.overflow,
  };

  const refreshing = Object.fromEntries(
    accountResources.map((key) => [key, flags[key].refreshing]),
  ) as Record<DashboardGroup, boolean>;

  return {
    // full lists (with the extra item), only for Missing
    myTasks: myTaskList.all,
    myRejectedTickets: myRejectedList.all,
    myPendingTickets: myPendingList.all,
    // lists for the UI, already cut to max
    shownMyTasks: myTaskList.shown,
    shownOtherTasks: otherTaskList.shown,
    shownMyRejectedTickets: myRejectedList.shown,
    shownMyPendingTickets: myPendingList.shown,
    shownOtherRejectedTickets: otherRejectedList.shown,
    shownOtherPendingTickets: otherPendingList.shown,
    overflowItems,
    refreshing,
    // label counting
    taskCounts: {
      myTasks: myTaskList.count,
      otherTasks: otherTaskList.count,
    },
    ticketCounts: {
      myRejectedTickets: myRejectedList.count,
      myPendingTickets: myPendingList.count,
      otherRejectedTickets: otherRejectedList.count,
      otherPendingTickets: otherPendingList.count,
    },
    categories,
    usernames,
    creatorRoles,
    loadingMyTasks,
    loadingOtherTasks: flags.otherTasks.loading,
    loadingCategories: flags.categories.loading,
    loadingMyTickets: myTicketFlags.some((flag) => flag.loading),
    loadingOtherTickets: otherTicketFlags.some((flag) => flag.loading),
    errorMyTasks: flags.myTasks.error,
    errorOtherTasks: flags.otherTasks.error,
    errorCategories: flags.categories.error,
    errorMyTickets: myTicketFlags.some((flag) => flag.error),
    errorOtherTickets: otherTicketFlags.some((flag) => flag.error),
    reloadTasks: () => setTasksReloadKey((key) => key + 1),
    reloadTickets: () => setTicketsReloadKey((key) => key + 1),
  };
}
